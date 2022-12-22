// adapted from https://observablehq.com/@d3/zoomable-circle-packing@165
import * as d3 from "d3";

interface CircleNodeRoot {
  name: string;
  value?: number;
  children: CircleNodeIncubateur[];
}

interface CircleNodeIncubateur {
  name: string;
  value?: number;
  children: CircleNode[];
}

interface CircleNode {
  id: string;
  name: string;
  phase: string;
  phaseStart: string;
  pitch: string;
  repository?: string;
  link?: string;
  value: number;
}

type PhaseType = {
  id: string;
  label: string;
  color: string;
};

function createPhasesArray<
  T extends readonly PhaseType[] & Array<{ id: V }>,
  V extends string
>(...args: T) {
  return args;
}

const phases = createPhasesArray(
  { id: "investigation", label: "Investigation", color: "#ffd079" },
  { id: "construction", label: "Construction", color: "#ff914d" },
  { id: "acceleration", label: "Accélération", color: "#fa6bbc" },
  { id: "success", label: "Pérennisé", color: "#0bffb3" },
  { id: "transfer", label: "Transfert", color: "#1fbcff" },
  { id: "alumni", label: "Partenariat terminé", color: "#aaa" }
);

type Phase = typeof phases[number]["id"];

const getPhaseKey = (id: Phase, key: "label" | "color") => {
  const phaseData = phases.find((p) => p.id === id);
  if (phaseData) {
    return phaseData[key];
  }
  return null;
};

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    // on resize, move the vizdetail
    const node = d3.select(entry.target).select("svg").node() as Element;
    if (node) {
      const { width, height } = node.getBoundingClientRect();
      const minSize = Math.min(width, height);
      const details = d3.select(entry.target).select("#vizdetail");
      details
        .style("width", minSize + "px")
        .style("left", (window.innerWidth - minSize) / 2 + "px");
    }
  }
});

const shortify = (str: string, maxLength = 30) =>
  str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;

const slugify = (str: string) => str.replace(/[\W]/g, "-");

const toDateFr = (str: string) => str && str.split("-").reverse().join("/");

const color = d3
  .scaleLinear()
  .domain([0, 5])
  //@ts-ignore
  .range(["hsl(152,80%,80%)", "hsl(228,30%,40%)"])
  //@ts-ignore
  .interpolate(d3.interpolateHcl);

export function drawChart(container: HTMLElement, data: CircleNodeRoot) {
  resizeObserver.observe(container);
  const width = 700;
  const height = 700;
  const root = d3.pack().size([width, height]).padding(2)(
    d3
      .hierarchy(data)
      .sum((d) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0))
  );
  let focus = root;
  //@ts-ignore
  let view;
  let zoomDepth = 0;

  const vizDetail = d3.select(container).append("div").attr("id", "vizdetail");

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
    .style("display", "block")
    .style("margin", "0 -14px")
    .style("background", "transparent")
    .style("cursor", "pointer")
    .on("click", (event) => {
      d3.selectAll("circle").attr("stroke", null);
      zoomDepth = 0;
      zoom(event, root);
    });

  const node = svg
    .append("g")
    .selectAll("circle")
    .data(root.descendants().slice(1))
    .join("circle")
    .attr("id", function (d) {
      if (d.parent) {
        //@ts-ignore
        return "node" + slugify(d.parent.data.name) + slugify(d.data.name);
      }
      return null;
    })
    .attr("fill", function (d) {
      //@ts-ignore
      const circleColor = getPhaseKey(d.data.phase, "color") || "white";
      return d.children ? color(d.depth) : circleColor;
    })
    .on("mouseover", function (_, d) {
      const depth = d.depth;
      if (depth === zoomDepth + 1) {
        d3.select(this).attr("stroke", "#000");
      } else if (depth === 2) {
        //@ts-ignore
        d3.selectAll("#nodeflare" + slugify(d.parent.data.name)).attr(
          "stroke",
          "#000"
        );
      }
    })
    .on("mouseout", function (_) {
      d3.selectAll("circle").attr("stroke", null);
    })
    .on("click", function (event, d) {
      const depth = d.depth;

      if (depth === zoomDepth) {
        zoomDepth -= 1;
        zoom(event, d.parent);
      } else if (depth === zoomDepth + 1 || depth === zoomDepth - 1) {
        zoomDepth = depth || 0;
        if (focus !== d) {
          zoom(event, d);
        }
      } else {
        zoomDepth += 1;
        zoom(event, d.parent);
      }
      event.stopPropagation();
    });

  const label = svg
    .append("g")
    .style("font", "10px sans-serif")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .selectAll("text")
    .data(root.descendants())
    .join("text")
    .style("fill-opacity", (d) => (d.parent === root ? 1 : 0))
    .style("display", (d) => (d.parent === root ? "inline" : "none"))
    // shortify labels for startups
    //@ts-ignore
    .text((d) => (d.depth === 2 && shortify(d.data.name)) || d.data.name);

  zoomTo([root.x, root.y, root.r * 2]);

  //@ts-ignore
  function zoomTo(v) {
    const k = width / v[2];

    view = v;

    label.attr(
      "transform",
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    node.attr(
      "transform",
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    node.attr("r", (d) => d.r * k);
  }

  //@ts-ignore
  function zoom(event: MouseEvent, d) {
    focus = d;

    const transition = svg
      .transition()
      .duration(event.altKey ? 7500 : 750)
      .tween("zoom", () => {
        //@ts-ignore
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        //@ts-ignore
        return (t) => zoomTo(i(t));
      });

    if (zoomDepth === 2) {
      console.log(d);
      const node = svg.node();
      if (node) {
        const { width, height } = node.getBoundingClientRect();
        const minSize = Math.min(width, height);
        vizDetail
          .style("width", minSize + "px")
          .style("left", (window.innerWidth - minSize) / 2 + "px")

          .html(
            `
          <h2>${d.data.name}</h2>
          
          Phase: ${getPhaseKey(d.data.phase, "label")}
          <br/>
          ${
            (d.data.phaseStart &&
              `<span style="font-size:0.8em">Depuis le: ${toDateFr(
                d.data.phaseStart
              )}</span>`) ||
            ""
          }
          <br/>
          <br/>
          <p>${d.data.pitch}</p>
          <br/>
          <img src="https://beta.gouv.fr/img/startups/${d.data.id}.png">
          ${
            (d.data.link &&
              `<p>🌍 <a href="${d.data.link}" target="_blank">${d.data.link}</a></p>`) ||
            ""
          }
          <p>ℹ️ <a href="https://beta.gouv.fr/startups/${
            d.data.id
          }.html" target="_blank">Fiche beta.gouv.fr</a></p>
          ${
            (d.data.repository &&
              `<p>📦 <a href="${d.data.repository}" target="_blank">Code source</a></p>`) ||
            ""
          }
        `
          )
          .transition()
          .delay(300)
          .style("display", "block")
          .duration(event.altKey ? 7500 : 750)
          .style("opacity", 1);
      }
    } else {
      vizDetail
        .transition()
        .duration(event.altKey ? 7500 : 300)
        .style("opacity", 0)
        .on("end", () => {
          vizDetail.style("display", "none");
        });
    }
    label
      .filter(function (d) {
        //@ts-ignore
        return d.parent === focus || this.style.display === "inline";
      })
      //@ts-ignore
      .transition(transition)
      .style("fill-opacity", (d) => (d.parent === focus ? 1 : 0))
      .on("start", function (d) {
        //@ts-ignore
        if (d.parent === focus) this.style.display = "inline";
      })
      .on("end", function (d) {
        //@ts-ignore
        if (d.parent !== focus) this.style.display = "none";
      });
  }

  return svg.node();
}

export const drawLegend = (container: HTMLElement) => {
  container.innerHTML = `
  ${phases
    .map(
      (phase) =>
        `<li><span style="background-color:${phase.color}" class="color"></span>${phase.label}</li>`
    )
    .join("\n")}
    <br/>
    <br/>
  `;
};
