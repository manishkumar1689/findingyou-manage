import Sortable from "sortablejs";

const sortable = (element: HTMLElement, callback = null) => {
  return new Sortable(element, {
    animation: 500,
    sort: true,
    easing: "cubic-bezier(1, 0, 0, 1)",
    handle: ".handle",

    // Element dragging ended
    onEnd: function(e) {
      if (callback instanceof Function) {
        const { newIndex, oldIndex, target } = e;
        const id = target.getAttribute("id");
        if (typeof id === "string") {
          const rels: Array<string> = [];
          const set = "p" + id.split("-").pop();
          target.childNodes.forEach((element) => {
            if (element instanceof HTMLElement) {
              const rel = element.getAttribute("rel");
              if (typeof rel === "string") {
                rels.push(rel);
              }
            }
          });

          callback({
            newIndex,
            oldIndex,
            rels,
            set,
          });
        }
      }
    },
  });
};

export default sortable;
