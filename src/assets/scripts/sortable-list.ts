import Sortable from "sortablejs";

const sortableList = (element: HTMLElement, callback = null) => {
  return new Sortable(element, {
    animation: 500,
    sort: true,
    easing: "cubic-bezier(1, 0, 0, 1)",
    handle: ".handle",

    // Element dragging ended
    onEnd: function(e) {
      if (callback instanceof Function) {
        const { newIndex, oldIndex, target } = e;
        callback({
          newIndex,
          oldIndex,
          target,
        });
      }
    },
  });
};

export default sortableList;
