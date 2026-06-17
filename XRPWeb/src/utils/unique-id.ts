const uniqueId = ((): ((prefix: string) => string) => {
    return (prefix: string): string => `${prefix}${window.crypto.randomUUID()}`;
  })();
  
export default uniqueId;