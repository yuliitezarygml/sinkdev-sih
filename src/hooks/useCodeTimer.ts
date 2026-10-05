import { useState, useEffect } from 'react';

export function useCodeTimer(period: number = 30) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const epoch = Math.floor(Date.now() / 1000);
    return period - (epoch % period);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const epoch = Math.floor(Date.now() / 1000);
      setSecondsLeft(period - (epoch % period));
    }, 1000);

    return () => clearInterval(timer);
  }, [period]);

  return {
    secondsLeft,
    progress: secondsLeft / period,
  };
}
