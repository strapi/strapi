import { useCallback, useEffect, useRef, useState } from 'react';

import { useDebounce } from './useDebounce';

interface UseWidgetResizeOptions {
    columnWidth: number;
    onWidthChange: (newWidth: number) => void;
    minWidth?: number;
    maxWidth?: number;
    threshold?: number;
    debounceMs?: number; // Debounce delay in milliseconds
}

// Valid column widths for discrete snapping (1/3, 1/2, 2/3, 3/3)
const DISCRETE_COLUMN_WIDTHS = [4, 6, 8, 12] as const;

// Helper function to snap to the nearest discrete column width
const snapToDiscreteWidth = (width: number): number => {
    return DISCRETE_COLUMN_WIDTHS.reduce((prev, curr) =>
        Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
    );
};

// Helper function to calculate new width based on mouse movement
const calculateNewWidth = (
    startWidth: number,
    deltaX: number,
    threshold: number,
    minWidth: number,
    maxWidth: number
): number => {
    const rawWidth = startWidth + Math.round(deltaX / threshold);
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
    return snapToDiscreteWidth(clampedWidth);
};

/**
 * Hook for handling widget resizing with discrete column snapping
 * Allows widgets to snap to predefined column widths (1/3, 1/2, 2/3, 3/3)
 */
export const useWidgetResize = ({
    columnWidth,
    onWidthChange,
    minWidth = 4,
    maxWidth = 12,
    threshold = 100,
    debounceMs = 50,
}: UseWidgetResizeOptions) => {
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);
    const [currentWidth, setCurrentWidth] = useState<number>(columnWidth);

    const debouncedWidth = useDebounce(currentWidth, debounceMs);

    // Apply debounced width changes to avoid excessive re-renders
    useEffect(() => {
        if (debouncedWidth !== columnWidth && debouncedWidth >= minWidth) {
            onWidthChange(debouncedWidth);
        }
    }, [debouncedWidth, columnWidth, onWidthChange, minWidth]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();

        // Store initial values
        const startX = e.clientX;
        const startWidth = columnWidth;
        startXRef.current = startX;
        startWidthRef.current = startWidth;

        // Create mouse event handlers
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newWidth = calculateNewWidth(startWidth, deltaX, threshold, minWidth, maxWidth);

            // Only update if width meets minimum requirements
            if (newWidth >= minWidth) {
                setCurrentWidth(newWidth);
            }
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            const finalDeltaX = upEvent.clientX - startX;
            const finalWidth = calculateNewWidth(startWidth, finalDeltaX, threshold, minWidth, maxWidth);

            // Apply final width immediately
            if (finalWidth >= minWidth) {
                setCurrentWidth(finalWidth);
                onWidthChange(finalWidth);
            }

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidth, onWidthChange, minWidth, maxWidth, threshold]);

    return { handleMouseDown };
};