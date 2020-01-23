import { useCallback, useState } from 'react';
import { useEventListener } from './useEventListener';

export const useIsMouseDown = () => {
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsMouseDown(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsMouseDown(false);
  }, []);

  useEventListener('mousedown', handleMouseDown);

  useEventListener('mouseup', handleMouseUp);

  return isMouseDown;
};
