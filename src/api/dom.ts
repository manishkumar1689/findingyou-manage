export const exitFullScreen = () => {
  document.body.classList.remove("fullscreen");
  if (document.exitFullscreen && document.fullscreen) {
    document.exitFullscreen();
  }
};

export const toggleFullScreen = (element: HTMLElement) => {
  if (!document.fullscreenElement) {
    element.requestFullscreen();
    document.body.classList.add("fullscreen");
  } else {
    exitFullScreen();
  }
};
