import "./style.css";

import { drawChart, drawLegend } from "./flare";
import data from "./startups.json";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>Les startups d'état par structure et par effectif</h1>
    <div id="legend"></div>
    <div id="viz"></div>
  </div>
`;

//@ts-ignore
drawChart(document.querySelector<HTMLDivElement>("#viz")!, data);
drawLegend(document.querySelector<HTMLDivElement>("#legend")!);
