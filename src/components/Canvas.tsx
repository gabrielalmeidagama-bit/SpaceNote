import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Note, NoteConnection, CanvasTransform, ViewMode, NoteType } from '../types/note';
import { NoteCard } from './NoteCard';
import {
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Mic,
  LayoutGrid,
  RotateCcw,
  Maximize,
  Sparkles,
  Calendar,
  X,
  Upload,
  ImagePlus,
  Pin,
  Plus,
  ArrowUpDown,
  Columns2,
  Columns3,
  Columns4,
  Inbox,
  ArrowLeftRight,
} from 'lucide-react';

interface CanvasProps {
  notes: Note[];
  connections: NoteConnection[];
  transform: CanvasTransform;
  selectedNoteIds: string[];
  connectingSourceId: string | null;
  isVaultUnlocked: boolean;
  viewMode: ViewMode;
  canUndoArrange?: boolean;
  undoCount?: number;
  onTransformChange: (t: CanvasTransform) => void;
  onSelectNote: (id: string | null, isMulti?: boolean) => void;
  onSelectMultipleNotes: (ids: string[]) => void;
  onUpdateNote: (id: string, updated: Partial<Note>) => void;
  onUpdateMultipleNotes: (updates: { id: string; x: number; y: number }[]) => void;
  onDeleteNote: (id: string) => void;
  onDuplicateNote: (note: Note) => void;
  onStartConnection: (fromId: string) => void;
  onCompleteConnection: (toId: string) => void;
  onDeleteConnection: (id: string) => void;
  onOpenLightbox: (url: string, title: string) => void;
  onNoteMoveFinished?: (prevNotes: Note[]) => void;
  onBeforeResize?: () => void;
  onFocusNote?: (noteId: string) => void;
  onAddNote?: (
    type: NoteType,
    worldX?: number,
    worldY?: number,
    initialData?: Partial<Note>
  ) => void;
  onAutoArrange?: () => void;
  onUndoArrange?: () => void;
  onFitAll?: () => void;
  onSwapNotes?: (sourceId: string, targetId: string) => void;
}

// Smart Alignment & Snapping Guide definition
interface AlignmentGuide {
  id: string;
  type: 'vertical' | 'horizontal';
  position: number; // coordinate (x for vertical guide, y for horizontal guide)
  start: number;
  end: number;
}

export const Canvas: React.FC<CanvasProps> = ({
  notes,
  connections,
  transform,
  selectedNoteIds,
  connectingSourceId,
  isVaultUnlocked,
  viewMode,
  canUndoArrange,
  undoCount = 0,
  onTransformChange,
  onSelectNote,
  onSelectMultipleNotes,
  onUpdateNote,
  onUpdateMultipleNotes,
  onDeleteNote,
  onDuplicateNote,
  onStartConnection,
  onCompleteConnection,
  onDeleteConnection,
  onOpenLightbox,
  onNoteMoveFinished,
  onBeforeResize,
  onFocusNote,
  onAddNote,
  onAutoArrange,
  onUndoArrange,
  onFitAll,
  onSwapNotes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Grid View Customization States
  const [gridTypeFilter, setGridTypeFilter] = useState<'all' | NoteType>('all');
  const [gridSortOrder, setGridSortOrder] = useState<'manual' | 'recent' | 'oldest' | 'title' | 'color'>('manual');
  const [gridColumns, setGridColumns] = useState<2 | 3 | 4>(3);
  const [showGridAddMenu, setShowGridAddMenu] = useState(false);
  const [draggedGridNoteId, setDraggedGridNoteId] = useState<string | null>(null);
  const [dragOverGridNoteId, setDragOverGridNoteId] = useState<string | null>(null);

  // Spacebar Pan Modifier (holding Space + Left Click to pan)
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Middle-Click Pan or Space+Left-Click Pan
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; camX: number; camY: number }>({
    x: 0,
    y: 0,
    camX: transform.x,
    camY: transform.y,
  });

  // Windows-style Left Click Marquee Selection Box
  const [marqueeBox, setMarqueeBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const isMarqueeActiveRef = useRef(false);
  const marqueeStartPosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const hasDraggedMarqueeRef = useRef(false);

  // Right-Click Creation Context Menu ("Janela de Criação")
  const [creationMenu, setCreationMenu] = useState<{
    isOpen: boolean;
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
  }>({
    isOpen: false,
    screenX: 0,
    screenY: 0,
    worldX: 0,
    worldY: 0,
  });

  // Card Dragging State
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedCardRef = useRef(false);
  const justFinishedDraggingRef = useRef(false);
  const notesAtDragStartRef = useRef<Note[] | null>(null);

  // Active group of note IDs being moved
  const groupInitialPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Active Alignment & Smart Snap Guides
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);

  // Touch pinch-to-zoom
  const touchDistanceRef = useRef<number | null>(null);

  // Drag and Drop files from OS/Desktop onto Blackboard Canvas
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Keyboard Space listener for quick pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
      if (e.key === 'Escape') {
        setCreationMenu((prev) => ({ ...prev, isOpen: false }));
        setMarqueeBox(null);
        isMarqueeActiveRef.current = false;
        setAlignmentGuides([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse wheel zoom centered on cursor
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(2.5, Math.max(0.2, transform.zoom * zoomFactor));

      const worldX = (mouseX - transform.x) / transform.zoom;
      const worldY = (mouseY - transform.y) / transform.zoom;

      const newX = mouseX - worldX * newZoom;
      const newY = mouseY - worldY * newZoom;

      onTransformChange({ x: newX, y: newY, zoom: newZoom });
    },
    [transform, onTransformChange]
  );

  // RIGHT CLICK ON BACKGROUND -> OPEN CREATION CONTEXT MENU
  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isNote = Boolean(target.closest('[data-note-id]'));
    const isInteractiveUI = Boolean(target.closest('button, input, textarea, a, select, [role="button"]'));

    if (!isNote && !isInteractiveUI && containerRef.current) {
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - transform.x) / transform.zoom;
      const worldY = (mouseY - transform.y) / transform.zoom;

      const menuWidth = 260;
      const menuHeight = 340;
      const posX = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 20));
      const posY = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 20));

      setCreationMenu({
        isOpen: true,
        screenX: posX,
        screenY: posY,
        worldX: Math.round(worldX),
        worldY: Math.round(worldY),
      });
    }
  };

  // SMART ALIGNMENT & PROXIMITY MAGNETIC SNAP CALCULATION
  const calculateSnappingAndGuides = useCallback(
    (
      rawAnchorX: number,
      rawAnchorY: number,
      anchorWidth: number,
      anchorHeight: number,
      anchorId: string
    ) => {
      const SNAP_THRESHOLD = 9; // threshold in world coordinates
      const STANDARD_GAP = 28;  // neat standard spacing between adjacent cards

      // Filter other notes that are NOT moving
      const movingIds = new Set(groupInitialPositionsRef.current.keys());
      const staticNotes = notes.filter((n) => !movingIds.has(n.id));

      if (staticNotes.length === 0) {
        return { snappedX: rawAnchorX, snappedY: rawAnchorY, guides: [] };
      }

      const aLeft = rawAnchorX;
      const aRight = rawAnchorX + anchorWidth;
      const aTop = rawAnchorY;
      const aBottom = rawAnchorY + anchorHeight;

      let bestSnapX = rawAnchorX;
      let minDiffX = SNAP_THRESHOLD;
      let activeGuideX: AlignmentGuide | null = null;

      let bestSnapY = rawAnchorY;
      let minDiffY = SNAP_THRESHOLD;
      let activeGuideY: AlignmentGuide | null = null;

      for (const other of staticNotes) {
        const oLeft = other.x;
        const oRight = other.x + other.width;
        const oTop = other.y;
        const oBottom = other.y + other.height;

        const yCoverageStart = Math.min(aTop, oTop) - 30;
        const yCoverageEnd = Math.max(aBottom, oBottom) + 30;
        const xCoverageStart = Math.min(aLeft, oLeft) - 30;
        const xCoverageEnd = Math.max(aRight, oRight) + 30;

        // ---------- X-AXIS EXTREMITY SNAPPING & GUIDES ----------

        // 1. Left-to-Left alignment
        let diff = Math.abs(aLeft - oLeft);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = oLeft;
          activeGuideX = {
            id: `v-l-l-${other.id}`,
            type: 'vertical',
            position: oLeft,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // 2. Right-to-Right alignment
        diff = Math.abs(aRight - oRight);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = oRight - anchorWidth;
          activeGuideX = {
            id: `v-r-r-${other.id}`,
            type: 'vertical',
            position: oRight,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // 3. Left-to-Right touching alignment
        diff = Math.abs(aLeft - oRight);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = oRight;
          activeGuideX = {
            id: `v-l-r-${other.id}`,
            type: 'vertical',
            position: oRight,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // 4. Right-to-Left touching alignment
        diff = Math.abs(aRight - oLeft);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = oLeft - anchorWidth;
          activeGuideX = {
            id: `v-r-l-${other.id}`,
            type: 'vertical',
            position: oLeft,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // 5. Smart Gap: Placed to the Right of other note (leaving STANDARD_GAP)
        const targetRightX = oRight + STANDARD_GAP;
        diff = Math.abs(aLeft - targetRightX);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = targetRightX;
          activeGuideX = {
            id: `v-gap-r-${other.id}`,
            type: 'vertical',
            position: targetRightX,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // 6. Smart Gap: Placed to the Left of other note (leaving STANDARD_GAP)
        const targetLeftX = oLeft - STANDARD_GAP - anchorWidth;
        diff = Math.abs(aRight - (oLeft - STANDARD_GAP));
        if (diff < minDiffX) {
          minDiffX = diff;
          bestSnapX = targetLeftX;
          activeGuideX = {
            id: `v-gap-l-${other.id}`,
            type: 'vertical',
            position: oLeft - STANDARD_GAP,
            start: yCoverageStart,
            end: yCoverageEnd,
          };
        }

        // ---------- Y-AXIS EXTREMITY SNAPPING & GUIDES ----------

        // 1. Top-to-Top alignment
        diff = Math.abs(aTop - oTop);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = oTop;
          activeGuideY = {
            id: `h-t-t-${other.id}`,
            type: 'horizontal',
            position: oTop,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }

        // 2. Bottom-to-Bottom alignment
        diff = Math.abs(aBottom - oBottom);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = oBottom - anchorHeight;
          activeGuideY = {
            id: `h-b-b-${other.id}`,
            type: 'horizontal',
            position: oBottom,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }

        // 3. Top-to-Bottom touching alignment
        diff = Math.abs(aTop - oBottom);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = oBottom;
          activeGuideY = {
            id: `h-t-b-${other.id}`,
            type: 'horizontal',
            position: oBottom,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }

        // 4. Bottom-to-Top touching alignment
        diff = Math.abs(aBottom - oTop);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = oTop - anchorHeight;
          activeGuideY = {
            id: `h-b-t-${other.id}`,
            type: 'horizontal',
            position: oTop,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }

        // 5. Smart Gap: Placed Below other note (leaving STANDARD_GAP)
        const targetBelowY = oBottom + STANDARD_GAP;
        diff = Math.abs(aTop - targetBelowY);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = targetBelowY;
          activeGuideY = {
            id: `h-gap-b-${other.id}`,
            type: 'horizontal',
            position: targetBelowY,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }

        // 6. Smart Gap: Placed Above other note (leaving STANDARD_GAP)
        const targetAboveY = oTop - STANDARD_GAP - anchorHeight;
        diff = Math.abs(aBottom - (oTop - STANDARD_GAP));
        if (diff < minDiffY) {
          minDiffY = diff;
          bestSnapY = targetAboveY;
          activeGuideY = {
            id: `h-gap-a-${other.id}`,
            type: 'horizontal',
            position: oTop - STANDARD_GAP,
            start: xCoverageStart,
            end: xCoverageEnd,
          };
        }
      }

      const guides: AlignmentGuide[] = [];
      if (activeGuideX) guides.push(activeGuideX);
      if (activeGuideY) guides.push(activeGuideY);

      return {
        snappedX: bestSnapX,
        snappedY: bestSnapY,
        guides,
      };
    },
    [notes]
  );

  // MOUSE DOWN: Left-Click Marquee, Middle-Click Pan, or Card Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (creationMenu.isOpen) {
      setCreationMenu((prev) => ({ ...prev, isOpen: false }));
    }

    const target = e.target as HTMLElement;

    // 1. MIDDLE CLICK (BUTTON === 1) OR SPACE + LEFT CLICK -> PAN CANVAS
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsMiddlePanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        camX: transform.x,
        camY: transform.y,
      };
      return;
    }

    // 2. LEFT CLICK ON NOTE DRAG HANDLE OR CARD
    if (e.button === 0) {
      const isDragHandle = target.closest('[data-drag-handle="true"]');
      if (isDragHandle) {
        const cardEl = target.closest('[data-note-id]');
        const noteId = cardEl?.getAttribute('data-note-id');
        const clickedNote = notes.find((n) => n.id === noteId);

        if (clickedNote) {
          // If note is pinned, it cannot be dragged or moved at all!
          if (clickedNote.isPinned) {
            const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
            onSelectNote(clickedNote.id, isMulti);
            return;
          }

          setDraggingNoteId(clickedNote.id);
          dragStartPosRef.current = { x: e.clientX, y: e.clientY };
          hasDraggedCardRef.current = false;
          notesAtDragStartRef.current = notes.map((n) => ({ ...n }));

          const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

          let targetIds: string[];
          if (selectedNoteIds.includes(clickedNote.id)) {
            targetIds = selectedNoteIds;
            if (isMulti) {
              targetIds = selectedNoteIds.filter((id) => id !== clickedNote.id);
              onSelectMultipleNotes(targetIds);
            }
          } else {
            if (isMulti) {
              targetIds = [...selectedNoteIds, clickedNote.id];
              onSelectMultipleNotes(targetIds);
            } else {
              targetIds = [clickedNote.id];
              onSelectMultipleNotes(targetIds);
            }
          }

          const groupPositions = new Map<string, { x: number; y: number }>();
          notes.forEach((n) => {
            // Only unpinned notes can be moved
            if (targetIds.includes(n.id) && !n.isPinned) {
              groupPositions.set(n.id, { x: n.x, y: n.y });
            }
          });
          groupInitialPositionsRef.current = groupPositions;

          const maxZ = Math.max(...notes.map((n) => n.zIndex || 0), 10);
          onUpdateNote(clickedNote.id, { zIndex: maxZ + 1 });
          return;
        }
      }

      // 3. LEFT CLICK ON CANVAS BACKGROUND -> WINDOWS-STYLE MARQUEE SELECTION BOX
      const isBackground =
        target === containerRef.current ||
        target.id === 'canvas-world' ||
        target.id === 'canvas-grid' ||
        target.tagName === 'svg';

      if (isBackground && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - transform.x) / transform.zoom;
        const worldY = (mouseY - transform.y) / transform.zoom;

        isMarqueeActiveRef.current = true;
        hasDraggedMarqueeRef.current = false;
        marqueeStartPosRef.current = { clientX: e.clientX, clientY: e.clientY };

        setMarqueeBox({
          startX: worldX,
          startY: worldY,
          currentX: worldX,
          currentY: worldY,
        });
      }
    }
  };

  // MOUSE MOVE: Handles Snapping, Card Dragging, Panning, and Marquee Selection
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Middle-Click Pan (or Space+Left Pan)
    if (isMiddlePanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      onTransformChange({
        ...transform,
        x: panStartRef.current.camX + dx,
        y: panStartRef.current.camY + dy,
      });
      return;
    }

    // 2. Dragging Card(s) with Smart Alignment & Proximity Snapping
    if (draggingNoteId && groupInitialPositionsRef.current.size > 0) {
      const rawDx = (e.clientX - dragStartPosRef.current.x) / transform.zoom;
      const rawDy = (e.clientY - dragStartPosRef.current.y) / transform.zoom;

      if (Math.hypot(rawDx, rawDy) > 3) {
        hasDraggedCardRef.current = true;
      }

      const anchorInitialPos = groupInitialPositionsRef.current.get(draggingNoteId);
      const anchorNote = notes.find((n) => n.id === draggingNoteId);

      let finalDx = rawDx;
      let finalDy = rawDy;

      // Calculate Magnetic Snapping (disabled if Alt key is pressed for free placement)
      if (anchorInitialPos && anchorNote && !e.altKey) {
        const rawAnchorX = anchorInitialPos.x + rawDx;
        const rawAnchorY = anchorInitialPos.y + rawDy;

        const { snappedX, snappedY, guides } = calculateSnappingAndGuides(
          rawAnchorX,
          rawAnchorY,
          anchorNote.width,
          anchorNote.height,
          anchorNote.id
        );

        finalDx = snappedX - anchorInitialPos.x;
        finalDy = snappedY - anchorInitialPos.y;
        setAlignmentGuides(guides);
      } else {
        setAlignmentGuides([]);
      }

      const updates: { id: string; x: number; y: number }[] = [];
      groupInitialPositionsRef.current.forEach((pos, id) => {
        updates.push({
          id,
          x: Math.round(pos.x + finalDx),
          y: Math.round(pos.y + finalDy),
        });
      });

      onUpdateMultipleNotes(updates);
      return;
    }

    // 3. Drawing Left-Click Marquee Selection Box (Windows-style)
    if (isMarqueeActiveRef.current && marqueeBox && containerRef.current) {
      const dx = e.clientX - marqueeStartPosRef.current.clientX;
      const dy = e.clientY - marqueeStartPosRef.current.clientY;

      if (Math.hypot(dx, dy) > 4) {
        hasDraggedMarqueeRef.current = true;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - transform.x) / transform.zoom;
      const worldY = (mouseY - transform.y) / transform.zoom;

      setMarqueeBox((prev) => (prev ? { ...prev, currentX: worldX, currentY: worldY } : null));

      const left = Math.min(marqueeBox.startX, worldX);
      const right = Math.max(marqueeBox.startX, worldX);
      const top = Math.min(marqueeBox.startY, worldY);
      const bottom = Math.max(marqueeBox.startY, worldY);

      if (hasDraggedMarqueeRef.current) {
        const matchedIds = notes
          .filter(
            (n) => n.x < right && n.x + n.width > left && n.y < bottom && n.y + n.height > top
          )
          .map((n) => n.id);

        onSelectMultipleNotes(matchedIds);
      }
      return;
    }
  };

  // MOUSE UP
  const handleMouseUp = (e: React.MouseEvent) => {
    // 1. Release Middle-Click Pan
    if (e.button === 1 || isMiddlePanning) {
      setIsMiddlePanning(false);
    }

    // 2. Finalize Card Drag & Clear Alignment Guide Lines
    if (draggingNoteId) {
      if (hasDraggedCardRef.current && notesAtDragStartRef.current) {
        onNoteMoveFinished?.(notesAtDragStartRef.current);
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 120);
      }
      notesAtDragStartRef.current = null;
      setDraggingNoteId(null);
      groupInitialPositionsRef.current.clear();
      setAlignmentGuides([]); // clear magnetic guides on release
    }

    // 3. Finalize Left-Click Marquee Selection Box
    if (isMarqueeActiveRef.current) {
      isMarqueeActiveRef.current = false;

      if (!hasDraggedMarqueeRef.current) {
        onSelectNote(null);
      } else if (marqueeBox) {
        const left = Math.min(marqueeBox.startX, marqueeBox.currentX);
        const right = Math.max(marqueeBox.startX, marqueeBox.currentX);
        const top = Math.min(marqueeBox.startY, marqueeBox.currentY);
        const bottom = Math.max(marqueeBox.startY, marqueeBox.currentY);

        const matchedIds = notes
          .filter(
            (n) => n.x < right && n.x + n.width > left && n.y < bottom && n.y + n.height > top
          )
          .map((n) => n.id);

        onSelectMultipleNotes(matchedIds);
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 120);
      }
      setMarqueeBox(null);
    }
  };

  // TOUCH HANDLERS (Mobile / Tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (creationMenu.isOpen) {
      setCreationMenu((prev) => ({ ...prev, isOpen: false }));
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = e.target as HTMLElement;
      const isDragHandle = target.closest('[data-drag-handle="true"]');

      if (isDragHandle) {
        const cardEl = target.closest('[data-note-id]');
        const noteId = cardEl?.getAttribute('data-note-id');
        const clickedNote = notes.find((n) => n.id === noteId);

        if (clickedNote) {
          // If note is pinned, it cannot be dragged or moved at all!
          if (clickedNote.isPinned) {
            onSelectNote(clickedNote.id, false);
            return;
          }

          setDraggingNoteId(clickedNote.id);
          dragStartPosRef.current = { x: touch.clientX, y: touch.clientY };
          hasDraggedCardRef.current = false;

          const targetIds = selectedNoteIds.includes(clickedNote.id)
            ? selectedNoteIds
            : [clickedNote.id];

          if (!selectedNoteIds.includes(clickedNote.id)) {
            onSelectMultipleNotes(targetIds);
          }

          const groupPositions = new Map<string, { x: number; y: number }>();
          notes.forEach((n) => {
            // Only unpinned notes can be moved
            if (targetIds.includes(n.id) && !n.isPinned) {
              groupPositions.set(n.id, { x: n.x, y: n.y });
            }
          });
          groupInitialPositionsRef.current = groupPositions;
          return;
        }
      }

      setIsMiddlePanning(true);
      panStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        camX: transform.x,
        camY: transform.y,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchDistanceRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      // Dragging Card(s) on touch with Snapping
      if (draggingNoteId && groupInitialPositionsRef.current.size > 0) {
        const rawDx = (touch.clientX - dragStartPosRef.current.x) / transform.zoom;
        const rawDy = (touch.clientY - dragStartPosRef.current.y) / transform.zoom;

        if (Math.hypot(rawDx, rawDy) > 3) {
          hasDraggedCardRef.current = true;
        }

        const anchorInitialPos = groupInitialPositionsRef.current.get(draggingNoteId);
        const anchorNote = notes.find((n) => n.id === draggingNoteId);

        let finalDx = rawDx;
        let finalDy = rawDy;

        if (anchorInitialPos && anchorNote) {
          const rawAnchorX = anchorInitialPos.x + rawDx;
          const rawAnchorY = anchorInitialPos.y + rawDy;

          const { snappedX, snappedY, guides } = calculateSnappingAndGuides(
            rawAnchorX,
            rawAnchorY,
            anchorNote.width,
            anchorNote.height,
            anchorNote.id
          );

          finalDx = snappedX - anchorInitialPos.x;
          finalDy = snappedY - anchorInitialPos.y;
          setAlignmentGuides(guides);
        }

        const updates: { id: string; x: number; y: number }[] = [];
        groupInitialPositionsRef.current.forEach((pos, id) => {
          updates.push({
            id,
            x: Math.round(pos.x + finalDx),
            y: Math.round(pos.y + finalDy),
          });
        });
        onUpdateMultipleNotes(updates);
        return;
      }

      // Touch Pan
      if (isMiddlePanning) {
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;
        onTransformChange({
          ...transform,
          x: panStartRef.current.camX + dx,
          y: panStartRef.current.camY + dy,
        });
      }
    } else if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / touchDistanceRef.current;
      const newZoom = Math.min(2.5, Math.max(0.2, transform.zoom * factor));
      onTransformChange({ ...transform, zoom: newZoom });
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    if (draggingNoteId) {
      if (hasDraggedCardRef.current) {
        justFinishedDraggingRef.current = true;
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 120);
      }
      setDraggingNoteId(null);
      groupInitialPositionsRef.current.clear();
      setAlignmentGuides([]);
    }

    setIsMiddlePanning(false);
    touchDistanceRef.current = null;
  };

  // Render SVG Bezier Connections
  const renderConnections = () => {
    const noteMap = new Map(notes.map((n) => [n.id, n]));

    return connections.map((conn) => {
      const fromNote = noteMap.get(conn.fromId);
      const toNote = noteMap.get(conn.toId);
      if (!fromNote || !toNote) return null;

      const x1 = fromNote.x + fromNote.width / 2;
      const y1 = fromNote.y + fromNote.height / 2;
      const x2 = toNote.x + toNote.width / 2;
      const y2 = toNote.y + toNote.height / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const cx1 = x1 + dx / 2;
      const cy1 = y1;
      const cx2 = x1 + dx / 2;
      const cy2 = y2;

      const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
      const color = conn.color || '#06b6d4';

      return (
        <g key={conn.id} className="group/conn">
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeOpacity="0.25"
            className="blur-xs"
          />
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeDasharray="6 4"
            className="transition-all"
          />
          <foreignObject
            x={(x1 + x2) / 2 - 12}
            y={(y1 + y2) / 2 - 12}
            width="24"
            height="24"
            className="overflow-visible"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConnection(conn.id);
              }}
              className="w-6 h-6 rounded-full bg-zinc-950/90 border border-zinc-700 text-zinc-400 hover:text-rose-400 hover:border-rose-500/50 flex items-center justify-center opacity-0 group-hover/conn:opacity-100 transition-opacity shadow-lg"
              title="Excluir conexão"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </foreignObject>
        </g>
      );
    });
  };

  // File Drag and Drop Handlers (Drag from desktop/OS and drop on blackboard)
  const handleCanvasDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsCanvasDragOver(true);
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      setIsCanvasDragOver(false);
      dragCounterRef.current = 0;
    }
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCanvasDragOver(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    // Calculate mouse drop position in canvas world coordinates
    const rect = containerRef.current?.getBoundingClientRect();
    const mouseClientX = e.clientX - (rect?.left || 0);
    const mouseClientY = e.clientY - (rect?.top || 0);

    const baseWorldX = Math.round((mouseClientX - transform.x) / transform.zoom - 190);
    const baseWorldY = Math.round((mouseClientY - transform.y) / transform.zoom - 160);

    files.forEach((file, index) => {
      // Offset multiple dropped files slightly
      const worldX = baseWorldX + index * 40;
      const worldY = baseWorldY + index * 40;

      // Clean file title
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'Imagem Solta';

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const base64Data = loadEvent.target?.result as string;
          onAddNote?.('image', worldX, worldY, {
            title: cleanTitle,
            imageUrl: base64Data,
            width: 380,
            height: 440,
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('audio/')) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const base64Audio = loadEvent.target?.result as string;
          onAddNote?.('audio', worldX, worldY, {
            title: cleanTitle,
            audioUrl: base64Audio,
            width: 360,
            height: 350,
          });
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const textContent = loadEvent.target?.result as string;
          onAddNote?.('text', worldX, worldY, {
            title: cleanTitle,
            content: textContent,
            width: 340,
            height: 300,
          });
        };
        reader.readAsText(file);
      }
    });
  };

  // Grid View Mode
  if (viewMode === 'grid') {
    // 1. Filter by category
    const filteredByGridType =
      gridTypeFilter === 'all'
        ? notes
        : notes.filter((n) => n.type === gridTypeFilter);

    // 2. Sort
    const sortedNotes = [...filteredByGridType].sort((a, b) => {
      if (gridSortOrder === 'recent') return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (gridSortOrder === 'oldest') return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (gridSortOrder === 'title') return (a.title || '').localeCompare(b.title || '');
      if (gridSortOrder === 'color') return (a.color || '').localeCompare(b.color || '');
      return 0;
    });

    // 3. Separate Pinned vs Regular Notes
    const pinnedNotes = sortedNotes.filter((n) => n.isPinned);
    const regularNotes = sortedNotes.filter((n) => !n.isPinned);

    // Dynamic grid columns class
    const gridColsClass =
      gridColumns === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : gridColumns === 4
        ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

    // Counts for filter pills
    const countAll = notes.length;
    const countText = notes.filter((n) => n.type === 'text').length;
    const countTodo = notes.filter((n) => n.type === 'todo').length;
    const countImage = notes.filter((n) => n.type === 'image').length;
    const countAudio = notes.filter((n) => n.type === 'audio').length;
    const countCalendar = notes.filter((n) => n.type === 'calendar').length;

    return (
      <div className="w-full h-full overflow-y-auto bg-[#07080b] text-zinc-100 select-none custom-scrollbar">
        {/* Subtle grid background texture matching the space canvas */}
        <div
          className="fixed inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 pt-20 pb-36 px-4 sm:px-8 max-w-7xl mx-auto space-y-6">
          {/* TOP ORGANIZED GRID TOOLBAR */}
          <div className="bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white tracking-wide">
                    Grade Organizada
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-semibold">
                    {sortedNotes.length} {sortedNotes.length === 1 ? 'nota' : 'notas'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Alinhamento simétrico, filtros por categoria e ordenação rápida
                </p>
              </div>
            </div>

            {/* Quick Actions & Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Drag reorder tip */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-[11px] text-zinc-400 font-mono">
                <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                <span>Arraste os cartões ou use as setas para trocar de lugar</span>
              </div>

              {/* Sort Order Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[11px] text-zinc-500 font-medium">Ordenar:</span>
                <select
                  value={gridSortOrder}
                  onChange={(e) => setGridSortOrder(e.target.value as any)}
                  className="bg-transparent text-zinc-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="manual" className="bg-zinc-950 text-cyan-300 font-semibold">
                    Personalizada (Arraste p/ trocar)
                  </option>
                  <option value="recent" className="bg-zinc-950 text-zinc-200">Mais recentes</option>
                  <option value="oldest" className="bg-zinc-950 text-zinc-200">Mais antigas</option>
                  <option value="title" className="bg-zinc-950 text-zinc-200">Título (A-Z)</option>
                  <option value="color" className="bg-zinc-950 text-zinc-200">Por Cor</option>
                </select>
              </div>

              {/* Column Density Toggle */}
              <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setGridColumns(2)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    gridColumns === 2 ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="2 Colunas (Visual amplo)"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGridColumns(3)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    gridColumns === 3 ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="3 Colunas (Padrão)"
                >
                  <Columns3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGridColumns(4)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    gridColumns === 4 ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title="4 Colunas (Compacto)"
                >
                  <Columns4 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Add Button with Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGridAddMenu(!showGridAddMenu)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova Nota</span>
                </button>

                {showGridAddMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-2 w-48 p-1.5 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onAddNote?.('text');
                        setShowGridAddMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 hover:bg-cyan-500/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Nota de Texto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddNote?.('todo');
                        setShowGridAddMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 hover:bg-emerald-500/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Lista de Tarefas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddNote?.('image');
                        setShowGridAddMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 hover:bg-purple-500/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Nota de Imagem</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddNote?.('audio');
                        setShowGridAddMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 hover:bg-amber-500/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nota de Áudio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddNote?.('calendar');
                        setShowGridAddMenu(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left flex items-center gap-2 hover:bg-yellow-500/15 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Calendário</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FILTER PILLS BY NOTE TYPE */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setGridTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'all'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span>Todas</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGridTypeFilter('text')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'text'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Texto</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countText}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGridTypeFilter('todo')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'todo'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tarefas</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countTodo}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGridTypeFilter('image')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'image'
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Imagens</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countImage}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGridTypeFilter('audio')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'audio'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>Áudio</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countAudio}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setGridTypeFilter('calendar')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gridTypeFilter === 'calendar'
                  ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-300 font-semibold shadow-xs'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-yellow-400" />
              <span>Calendário</span>
              <span className="px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] font-mono text-zinc-300">
                {countCalendar}
              </span>
            </button>
          </div>

          {/* EMPTY STATE */}
          {sortedNotes.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-zinc-950/40 border border-zinc-800/60">
              <div className="w-14 h-14 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-zinc-200 mb-1">
                Nenhuma nota encontrada
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed">
                {gridTypeFilter !== 'all'
                  ? `Você não tem notas do tipo "${gridTypeFilter}" criadas no momento.`
                  : 'Seu quadro está vazio. Crie uma nota para começar!'}
              </p>
              <button
                type="button"
                onClick={() => onAddNote?.(gridTypeFilter === 'all' ? 'text' : gridTypeFilter)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Criar primeira nota</span>
              </button>
            </div>
          )}

          {/* PINNED NOTES SECTION (if any) */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 text-xs font-semibold text-amber-400/90 font-mono uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5 fill-amber-400" />
                <span>Notas Fixadas ({pinnedNotes.length})</span>
              </div>
              <div className={`grid ${gridColsClass} gap-6`}>
                {pinnedNotes.map((note, index) => {
                  const isDraggingThis = draggedGridNoteId === note.id;
                  const isDragOverThis = dragOverGridNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', note.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedGridNoteId(note.id);
                      }}
                      onDragEnd={() => {
                        setDraggedGridNoteId(null);
                        setDragOverGridNoteId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggedGridNoteId && draggedGridNoteId !== note.id && dragOverGridNoteId !== note.id) {
                          setDragOverGridNoteId(note.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (dragOverGridNoteId === note.id && !e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverGridNoteId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData('text/plain') || draggedGridNoteId;
                        if (sourceId && sourceId !== note.id) {
                          setGridSortOrder('manual');
                          onSwapNotes?.(sourceId, note.id);
                        }
                        setDraggedGridNoteId(null);
                        setDragOverGridNoteId(null);
                      }}
                      className={`relative w-full h-[380px] rounded-2xl transition-all duration-200 ${
                        isDraggingThis ? 'opacity-30 scale-[0.98]' : ''
                      } ${
                        isDragOverThis
                          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.4)] z-30'
                          : ''
                      }`}
                    >
                      {/* Drop to swap overlay */}
                      {isDragOverThis && (
                        <div className="absolute inset-0 z-50 pointer-events-none rounded-2xl bg-cyan-950/60 backdrop-blur-xs border-2 border-cyan-400 border-dashed flex items-center justify-center animate-in fade-in duration-150">
                          <div className="px-3.5 py-2 rounded-xl bg-zinc-950/95 border border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                            <ArrowLeftRight className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span>Solte para trocar aqui</span>
                          </div>
                        </div>
                      )}

                      <NoteCard
                        note={note}
                        isSelected={selectedNoteIds.includes(note.id)}
                        isConnectingSource={connectingSourceId === note.id}
                        isVaultUnlocked={isVaultUnlocked}
                        zoom={1}
                        isGridMode={true}
                        onSwapPrev={
                          index > 0
                            ? () => {
                                setGridSortOrder('manual');
                                onSwapNotes?.(note.id, pinnedNotes[index - 1].id);
                              }
                            : undefined
                        }
                        onSwapNext={
                          index < pinnedNotes.length - 1
                            ? () => {
                                setGridSortOrder('manual');
                                onSwapNotes?.(note.id, pinnedNotes[index + 1].id);
                              }
                            : undefined
                        }
                        onSelect={(e) => {
                          onSelectNote(note.id, e.shiftKey || e.ctrlKey || e.metaKey);
                        }}
                        onUpdate={(up) => onUpdateNote(note.id, up)}
                        onDelete={onDeleteNote}
                        onDuplicate={onDuplicateNote}
                        onStartConnection={onStartConnection}
                        onOpenLightbox={onOpenLightbox}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REGULAR NOTES SECTION */}
          {regularNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 px-1 text-xs font-semibold text-zinc-400 font-mono uppercase tracking-wider pt-4 border-t border-zinc-800/80">
                  <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Outras Notas ({regularNotes.length})</span>
                </div>
              )}
              <div className={`grid ${gridColsClass} gap-6`}>
                {regularNotes.map((note, index) => {
                  const isDraggingThis = draggedGridNoteId === note.id;
                  const isDragOverThis = dragOverGridNoteId === note.id;

                  return (
                    <div
                      key={note.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', note.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedGridNoteId(note.id);
                      }}
                      onDragEnd={() => {
                        setDraggedGridNoteId(null);
                        setDragOverGridNoteId(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (draggedGridNoteId && draggedGridNoteId !== note.id && dragOverGridNoteId !== note.id) {
                          setDragOverGridNoteId(note.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (dragOverGridNoteId === note.id && !e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverGridNoteId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const sourceId = e.dataTransfer.getData('text/plain') || draggedGridNoteId;
                        if (sourceId && sourceId !== note.id) {
                          setGridSortOrder('manual');
                          onSwapNotes?.(sourceId, note.id);
                        }
                        setDraggedGridNoteId(null);
                        setDragOverGridNoteId(null);
                      }}
                      className={`relative w-full h-[380px] rounded-2xl transition-all duration-200 ${
                        isDraggingThis ? 'opacity-30 scale-[0.98]' : ''
                      } ${
                        isDragOverThis
                          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-zinc-950 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.4)] z-30'
                          : ''
                      }`}
                    >
                      {/* Drop to swap overlay */}
                      {isDragOverThis && (
                        <div className="absolute inset-0 z-50 pointer-events-none rounded-2xl bg-cyan-950/60 backdrop-blur-xs border-2 border-cyan-400 border-dashed flex items-center justify-center animate-in fade-in duration-150">
                          <div className="px-3.5 py-2 rounded-xl bg-zinc-950/95 border border-cyan-400 text-cyan-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                            <ArrowLeftRight className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span>Solte para trocar aqui</span>
                          </div>
                        </div>
                      )}

                      <NoteCard
                        note={note}
                        isSelected={selectedNoteIds.includes(note.id)}
                        isConnectingSource={connectingSourceId === note.id}
                        isVaultUnlocked={isVaultUnlocked}
                        zoom={1}
                        isGridMode={true}
                        onSwapPrev={
                          index > 0
                            ? () => {
                                setGridSortOrder('manual');
                                onSwapNotes?.(note.id, regularNotes[index - 1].id);
                              }
                            : undefined
                        }
                        onSwapNext={
                          index < regularNotes.length - 1
                            ? () => {
                                setGridSortOrder('manual');
                                onSwapNotes?.(note.id, regularNotes[index + 1].id);
                              }
                            : undefined
                        }
                        onSelect={(e) => {
                          onSelectNote(note.id, e.shiftKey || e.ctrlKey || e.metaKey);
                        }}
                        onUpdate={(up) => onUpdateNote(note.id, up)}
                        onDelete={onDeleteNote}
                        onDuplicate={onDuplicateNote}
                        onStartConnection={onStartConnection}
                        onOpenLightbox={onOpenLightbox}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Marquee Box Dimensions in World Coordinates
  const boxLeft = marqueeBox ? Math.min(marqueeBox.startX, marqueeBox.currentX) : 0;
  const boxTop = marqueeBox ? Math.min(marqueeBox.startY, marqueeBox.currentY) : 0;
  const boxWidth = marqueeBox ? Math.abs(marqueeBox.currentX - marqueeBox.startX) : 0;
  const boxHeight = marqueeBox ? Math.abs(marqueeBox.currentY - marqueeBox.startY) : 0;

  // Determine dynamic cursor
  const cursorClass = isMiddlePanning
    ? 'cursor-grabbing'
    : isSpacePressed
    ? 'cursor-grab'
    : 'cursor-default';

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragEnter={handleCanvasDragEnter}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
      className={`relative w-screen h-screen overflow-hidden bg-[#07080b] select-none ${cursorClass}`}
      style={{ touchAction: 'none' }}
    >
      {/* DRAG AND DROP FILE GLOW OVERLAY */}
      {isCanvasDragOver && (
        <div className="absolute inset-0 z-50 pointer-events-none border-4 border-cyan-400 border-dashed bg-cyan-950/40 backdrop-blur-xs flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
          <div className="px-6 py-4 rounded-2xl bg-zinc-950/90 border border-cyan-500/60 shadow-[0_0_50px_rgba(6,182,212,0.4)] flex items-center gap-3 text-cyan-300">
            <ImagePlus className="w-8 h-8 text-cyan-400 animate-bounce" />
            <div>
              <p className="text-base font-bold text-white">Solte a imagem aqui</p>
              <p className="text-xs text-cyan-400/80 font-mono">
                Uma nova nota de imagem será criada na posição do mouse
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Parallax Dot Grid */}
      <div
        id="canvas-grid"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)`,
          backgroundSize: `${32 * transform.zoom}px ${32 * transform.zoom}px`,
          backgroundPosition: `${transform.x}px ${transform.y}px`,
        }}
      />

      {/* Subtle cosmic vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />

      {/* World Coordinate Container */}
      <div
        id="canvas-world"
        className="absolute inset-0 origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          willChange: 'transform',
        }}
      >
        {/* SVG Connections & Alignment Guide Lines Layer */}
        <svg className="absolute -inset-[5000px] w-[10000px] h-[10000px] pointer-events-none overflow-visible">
          {/* Note Connections */}
          {renderConnections()}

          {/* MAGNIFIC SPACE ALIGNMENT GUIDE LINE (Solid 1px hairline from corner to corner) */}
          {alignmentGuides.map((guide) => (
            <g key={guide.id}>
              {guide.type === 'vertical' ? (
                <line
                  x1={guide.position}
                  y1={-50000}
                  x2={guide.position}
                  y2={50000}
                  stroke="rgba(255, 255, 255, 0.55)"
                  strokeWidth={1 / transform.zoom}
                />
              ) : (
                <line
                  x1={-50000}
                  y1={guide.position}
                  x2={50000}
                  y2={guide.position}
                  stroke="rgba(255, 255, 255, 0.55)"
                  strokeWidth={1 / transform.zoom}
                />
              )}
            </g>
          ))}
        </svg>

        {/* Note Cards Layer */}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            isSelected={selectedNoteIds.includes(note.id)}
            isConnectingSource={connectingSourceId === note.id}
            isVaultUnlocked={isVaultUnlocked}
            zoom={transform.zoom}
            onSelect={(e) => {
              if (justFinishedDraggingRef.current) return;

              if (connectingSourceId && connectingSourceId !== note.id) {
                e.stopPropagation();
                onCompleteConnection(note.id);
              } else {
                const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                if (!isMulti && selectedNoteIds.includes(note.id) && selectedNoteIds.length > 1) {
                  return;
                }
                onSelectNote(note.id, isMulti);
              }
            }}
            onUpdate={(updated) => onUpdateNote(note.id, updated)}
            onDelete={onDeleteNote}
            onDuplicate={onDuplicateNote}
            onStartConnection={onStartConnection}
            onOpenLightbox={onOpenLightbox}
            onBeforeResize={onBeforeResize}
            allNotes={notes}
            onFocusNote={onFocusNote}
          />
        ))}

        {/* WINDOWS-STYLE SELECTION MARQUEE RECTANGLE (Left Click Hold & Drag) */}
        {marqueeBox && hasDraggedMarqueeRef.current && (boxWidth > 3 || boxHeight > 3) && (
          <div
            className="absolute pointer-events-none border-2 border-dashed border-cyan-400 bg-cyan-400/20 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-[0.5px] transition-all"
            style={{
              left: `${boxLeft}px`,
              top: `${boxTop}px`,
              width: `${boxWidth}px`,
              height: `${boxHeight}px`,
            }}
          >
            {/* Real-time selection counter badge */}
            <div className="absolute -top-6 left-1 px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-500/50 text-[10px] font-mono text-cyan-300 font-semibold shadow-lg">
              {selectedNoteIds.length} selecionada(s)
            </div>
          </div>
        )}
      </div>

      {/* RIGHT-CLICK CREATION WINDOW (Janela de Criação Contextual) */}
      {creationMenu.isOpen && (
        <>
          {/* Backdrop overlay to safely close menu when clicking outside without triggering marquee or moving notes */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onMouseDown={(e) => {
              e.stopPropagation();
              setCreationMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setCreationMenu((prev) => ({ ...prev, isOpen: false }));
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const worldX = (mouseX - transform.x) / transform.zoom;
                const worldY = (mouseY - transform.y) / transform.zoom;

                const menuWidth = 260;
                const menuHeight = 340;
                const posX = Math.max(10, Math.min(e.clientX, window.innerWidth - menuWidth - 20));
                const posY = Math.max(10, Math.min(e.clientY, window.innerHeight - menuHeight - 20));

                setCreationMenu({
                  isOpen: true,
                  screenX: posX,
                  screenY: posY,
                  worldX: Math.round(worldX),
                  worldY: Math.round(worldY),
                });
              }
            }}
          />

          <div
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-64 p-2 bg-zinc-950/95 backdrop-blur-2xl border border-cyan-500/40 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.2)] animate-in fade-in zoom-in-95 duration-150 select-none"
            style={{
              left: `${creationMenu.screenX}px`,
              top: `${creationMenu.screenY}px`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800 text-[11px] text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Criar no Espaço
              </span>
              <span className="text-[10px] text-zinc-500">
                {creationMenu.worldX}, {creationMenu.worldY}
              </span>
            </div>

            {/* Creation Options */}
            <div className="py-1 space-y-0.5 text-xs">
              {/* Texto */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.('text', creationMenu.worldX, creationMenu.worldY);
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-zinc-200 hover:text-white hover:bg-cyan-500/15 transition-colors group text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">Nota de Texto</div>
                  <div className="text-[10px] text-zinc-400">Ideias, notas e formatação</div>
                </div>
              </button>

              {/* Tarefas */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.('todo', creationMenu.worldX, creationMenu.worldY);
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-zinc-200 hover:text-white hover:bg-emerald-500/15 transition-colors group text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">Lista de Tarefas</div>
                  <div className="text-[10px] text-zinc-400">Checklist e progresso interativo</div>
                </div>
              </button>

              {/* Imagem */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.('image', creationMenu.worldX, creationMenu.worldY);
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-zinc-200 hover:text-white hover:bg-purple-500/15 transition-colors group text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">Nota de Imagem</div>
                  <div className="text-[10px] text-zinc-400">Anexo de foto com texto livre</div>
                </div>
              </button>

              {/* Áudio */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.('audio', creationMenu.worldX, creationMenu.worldY);
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-zinc-200 hover:text-white hover:bg-amber-500/15 transition-colors group text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">Nota de Áudio</div>
                  <div className="text-[10px] text-zinc-400">Gravar voz ou carregar áudio</div>
                </div>
              </button>

              {/* Calendário */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddNote?.('calendar', creationMenu.worldX, creationMenu.worldY);
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-zinc-200 hover:text-white hover:bg-yellow-500/15 transition-colors group text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-zinc-100">Calendário</div>
                  <div className="text-[10px] text-zinc-400">Mês, dias e lembretes integrados</div>
                </div>
              </button>
            </div>

            {/* Quick Layout Actions */}
            <div className="mt-1 pt-1 border-t border-zinc-800/80 space-y-0.5 text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAutoArrange?.();
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors text-left text-[11px] cursor-pointer"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Organizar Tudo em Grade</span>
              </button>

              {canUndoArrange && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUndoArrange?.();
                    setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors text-left text-[11px] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Desfazer Última Alteração ({undoCount}x)</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFitAll?.();
                  setCreationMenu((prev) => ({ ...prev, isOpen: false }));
                }}
                className="w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors text-left text-[11px] cursor-pointer"
              >
                <Maximize className="w-3.5 h-3.5 text-cyan-400" />
                <span>Centralizar e Ajustar Visão</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom-Left Space Coordinate HUD & Shortcuts Legend */}
      <div className="fixed bottom-6 left-6 z-30 pointer-events-none font-mono text-[11px] text-zinc-500/80 bg-zinc-950/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800/40 hidden sm:flex items-center gap-3">
        <span>X: {Math.round(-transform.x / transform.zoom)}</span>
        <span>Y: {Math.round(-transform.y / transform.zoom)}</span>
        <span>Zoom: {Math.round(transform.zoom * 100)}%</span>
        <span>Notas: {notes.length}</span>
        {selectedNoteIds.length > 0 ? (
          <span className="text-cyan-400 font-semibold">
            {selectedNoteIds.length} selecionada(s)
          </span>
        ) : (
          <span className="text-zinc-500 hidden md:inline">
            Clique dir.: criar | Arraste arquivos/fotos do PC para soltar no quadro
          </span>
        )}
      </div>
    </div>
  );
};
