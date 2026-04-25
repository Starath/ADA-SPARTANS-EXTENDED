declare module "webgazer" {
  const webgazer: {
    begin: () => Promise<void> | unknown;
    setGazeListener: (
      listener: (data: { x: number; y: number } | null, elapsed?: number) => void
    ) => typeof webgazer;
    saveDataAcrossSessions: (value: boolean) => typeof webgazer;
    showVideoPreview: (value: boolean) => typeof webgazer;
    showPredictionPoints: (value: boolean) => typeof webgazer;
    recordScreenPosition?: (x: number, y: number, type: string) => void;
    clearData?: () => void;
  };
  export default webgazer;
}
