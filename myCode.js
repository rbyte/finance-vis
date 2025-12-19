
let container = document.getElementById("container")

function draw(svgNode) {
	container.append(svgNode.node());
}

document.onreadystatechange = async () => {
  if (document.readyState === 'complete') {
  // let data = d3.csv("alphabet.csv");
  // const data = await d3.csv("alphabet.csv");
  // const dataUSpop = await d3.csv("us-population-state-age.csv");
  // const data2 = await d3.json("data.json");
  // console.log(dataUSpop)
  // const flare = await d3.json("flare-2.json");
  const finance2025 = await d3.json("financialReport.json");

  // const d2 = await d3.csv("us-population-state-age.csv");

  // let x = dataUSpop.columns.slice(1).flatMap((age) => data.map((d) => ({state: d.name, age, population: d[age]})));
  // console.log(x)
  // const dataUSpop = d2.columns.slice(1).flatMap((age) => data.map((d) => ({state: d.name, age, population: d[age]})));

  // default
  let drawingToUse = icicle;

  let chartSelection = document.getElementById("chartSelection")
  chartSelection.addEventListener('change', function() {
    const selectedValue = this.value;
    if (selectedValue === "SunburstZ") {
      drawingToUse = sunburstZoomable
    }
    if (selectedValue === "IcicleZ") {
      drawingToUse = icicle
    }

    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    
    draw(drawingToUse(finance2025))
  });

  let svgNode = drawingToUse(finance2025)
  draw(svgNode)
  }
}

// https://observablehq.com/@d3/zoomable-icicle
function icicle(data) {
  const width = 1700;
  const height = 930;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  // Compute the layout.
  let hierarchy = d3.hierarchy(data)
    .sum(d => d.value)

    // manual "unsum" ... I cannot avoid using "sum" above
    hierarchy.eachBefore(node => {
    if (node.children) {
      let childrenSum = 0;
      for (const child of node.children) {
        childrenSum += child.value;
      }
      // Subtract the children's total from the parent's total
      // to isolate the parent's original individual value
      node.value = node.value - childrenSum;
    }
    });

  hierarchy.sort((a, b) => b.value - a.value);
  
  const root = d3.partition()
      .size([height, (hierarchy.height + 1) * width / 3])
    (hierarchy);

  let textSize = (xDiff) => `${xDiff ** 0.3 * 5.3}pt`
  let labelX = (xDiff) => `${xDiff ** 0.3}pt`
  let labelY = (xDiff) => `${xDiff ** 0.3 * 5.1}pt`
  let valueX = (xDiff) => `${xDiff ** 0.3 * 0.6}pt`
  let valueY = (xDiff) => `${xDiff ** 0.3 * 10.2}pt`

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])

  // Append cells.
  const cell = svg
    .selectAll("g")
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.y0},${d.x0})`)

  const rect = cell.append("rect")
      .attr("width", d => d.y1 - d.y0 - 1)
      .attr("height", d => rectHeight(d))
      // .attr("fill-opacity", 0.6)
      .attr("class", "myBackdrop")
      .attr("fill", d => {
        if (!d.depth) return "#ccc";
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .style("cursor", "pointer")
      .on("click", clicked);

  const text = cell.append("text")
      .attr("class", "label")
    // .attr("opacity", d => d.depth >= 1 ? 1 : 0)
    .attr("font-size", d => textSize(d.x1 - d.x0))
    .attr("x", d => labelX(d.x1 - d.x0))
    .attr("y", d => labelY(d.x1 - d.x0))
      .attr("fill-opacity", d => +labelVisible(d));

// var data = [
//   {text: "Here is sample text that has been <strong>wrapped</strong> using d3plus.textBox."}
// ];
//   let textbox = new d3plus.TextBox()
//     .data([{text: "Here is sample text that has been <strong>wrapped</strong> using d3plus.textBox."}])
//     .fontSize(16)
//     .width(200)
//     .x(function(d, i) { return i * 250; })
//     .select(cell.node())
//     .render()

  text.append("tspan")
      .text(d => d.data.name);

  const format = d3.format(",d");
  const tspan = text.append("tspan")
      .attr("fill-opacity", d => labelVisible(d) * 0.7)
      // .attr("x", d => valueX(d.x1 - d.x0))
      // .attr("y", d => valueY(d.x1 - d.x0))
      .text(d => ` €${format(d.value/1000)}K`);

  cell.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);


  // On click, change the focus and transitions it into view.
  let focus = root;
  function clicked(event, p) {
    focus = focus === p ? p = p.parent : p;

    root.each(d => d.target = {
      x0: (d.x0 - p.x0) / (p.x1 - p.x0) * height,
      x1: (d.x1 - p.x0) / (p.x1 - p.x0) * height,
      y0: d.y0 - p.y0,
      y1: d.y1 - p.y0
    });

    const t = cell.transition().duration(1400)
        .attr("transform", d => `translate(${d.target.y0},${d.target.x0})`);

    rect.transition(t).attr("height", d => rectHeight(d.target));
    text.transition(t).attr("fill-opacity", d => +labelVisible(d.target));
    text.transition(t).attr("font-size", d => textSize(d.target.x1 - d.target.x0))
    text.transition(t).attr("x", d => labelX(d.target.x1 - d.target.x0))
    text.transition(t).attr("y", d => labelY(d.target.x1 - d.target.x0))
      
      
    // tspan.transition(t).attr("x", d => valueX(d.target.x1 - d.target.x0))
    // tspan.transition(t).attr("y", d => valueY(d.target.x1 - d.target.x0))
    tspan.transition(t).attr("fill-opacity", d => labelVisible(d.target) * 0.7);
  }
  
  function rectHeight(d) {
    return d.x1 - d.x0 - Math.min(1, (d.x1 - d.x0) / 2);
  }

  function labelVisible(d) {
    return d.y1 <= width && d.y0 >= 0 && d.x1 - d.x0 > 22;
  }
  
  return svg;
}

function icicleStatic(data) {
  // Specify the chart’s dimensions.
  const width = 2500;
  const height = 3558;
  const format = d3.format(",d");

  // Create a color scale (a color for each child of the root node and their descendants).
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1))

  // Create a partition layout.
  const partition = d3.partition()
      .size([height, width])
      .padding(1);

  // Apply the partition layout.
  // Compute the layout.
  let hierarchy = d3.hierarchy(data)
    .sum(d => d.value)

    // manual "unsum" ... I cannot avoid using "sum" above
    hierarchy.eachBefore(node => {
    if (node.children) {
      let childrenSum = 0;
      for (const child of node.children) {
        childrenSum += child.value;
      }
      // Subtract the children's total from the parent's total
      // to isolate the parent's original individual value
      node.value = node.value - childrenSum;
    }
    });

  hierarchy.sort((a, b) => b.value - a.value);

  const root = partition(hierarchy);

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif");

  // Add a cell for each node of the hierarchy.
  const cell = svg
    .selectAll()
    .data(root.descendants())
    .join("g")
      .attr("transform", d => `translate(${d.y0},${d.x0})`)

  cell.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}€`);

  let textSize = (xDiff) => `${xDiff ** 0.33 * 3.3}pt`
  let labelX = (xDiff) => `${xDiff ** 0.3}pt`
  let labelY = (xDiff) => `${xDiff ** 0.3 * 4.3}pt`
  let valueX = (xDiff) => `${xDiff ** 0.3 * 0.6}pt`
  let valueY = (xDiff) => `${xDiff ** 0.3 * 10.2}pt`

  // Color the cell with respect to which child of root it belongs to. 
  cell.append("rect")
      // .attr("width", d => d.depth == 0 ? 10 : d.y1 - d.y0)
      .attr("width", d => d.y1 - d.y0)
      .attr("height", d => d.x1 - d.x0)
      .attr("class", "myBackdrop")
      // .attr("fill-opacity", 0.6)
      .attr("fill", d => {
        if (!d.depth) return "#ebebebff";
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      });

  // Add labels and a title.
  const text = cell
    // .filter(d => (d.x1 - d.x0) > 16)
    .append("text")
    .attr("class", "label")
    // .attr("opacity", d => d.depth >= 1 ? 1 : 0)
    .attr("font-weight", "bold")
    .attr("font-size", d => textSize(d.x1 - d.x0))
    // .attr("font-size", "8pt")
    .attr("x", d => labelX(d.x1 - d.x0))
    .attr("y", d => labelY(d.x1 - d.x0))

  text.append("tspan")
      .text(d => d.data.name);

  text.append("tspan")
      .attr("fill-opacity", 0.7)
      // .attr("x", "0pt")
      // .attr("y", d => `${(d.x1 - d.x0) ** 0.5 * 2.3}pt`)
      .text(d => ` €${format(d.value/1000)}K`);

  return svg
}


function sunburstZoomable(data) {
  // Specify the chart’s dimensions.
  const width = 928;
  const height = width;
  const radius = width / 6;

  // Create the color scale.
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  // Compute the layout.
  let hierarchy = d3.hierarchy(data)
    .sum(d => d.value)

    // manual "unsum" ... I cannot avoid using "sum" above
    hierarchy.eachBefore(node => {
    if (node.children) {
      let childrenSum = 0;
      for (const child of node.children) {
        childrenSum += child.value;
      }
      // Subtract the children's total from the parent's total
      // to isolate the parent's original individual value
      node.value = node.value - childrenSum;
    }
    });

  hierarchy.sort((a, b) => b.value - a.value);

  const root = d3.partition()
      .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);
  root.each(d => d.current = d);

  // Create the arc generator.
  const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius(d => d.y0 * radius)
      .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("viewBox", [-width / 2, -height / 2, width, width])
      .style("font", "10px sans-serif");

  // Append the arcs.
  const path = svg.append("g")
    .selectAll("path")
    .data(root.descendants().slice(1))
    .join("path")
      .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
      .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
      .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
      .attr("d", d => arc(d.current));

  // Make them clickable if they have children.
  path.filter(d => d.children)
      .style("cursor", "pointer")
      .on("click", clicked);

  const format = d3.format(",d");
  path.append("title")
      .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${format(d.value)}`);

  const label = svg.append("g")
      .attr("class", "GsunburstText")
    .selectAll("text")
    .data(root.descendants().slice(1))
    .join("text")
      .attr("dy", "0.35em")
      .attr("fill-opacity", d => +labelVisible(d.current))
      .attr("transform", d => labelTransform(d.current))
      .text(d => d.data.name);

  // text.append("tspan")
  //     .text(d => d.data.name);

  const tspan = label.append("tspan")
      .attr("fill-opacity", d => labelVisible(d) * 0.7)
      // .attr("x", d => valueX(d.x1 - d.x0))
      // .attr("y", d => valueY(d.x1 - d.x0))
      .text(d => ` €${format(d.value/1000)}K`);
      


  const parent = svg.append("circle")
      .datum(root)
      .attr("r", radius)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("click", clicked);

  // Handle zoom on click.
  function clicked(event, p) {
    parent.datum(p.parent || root);

    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    const t = svg.transition().duration(event.altKey ? 7500 : 750);

    // Transition the data on all arcs, even the ones that aren’t visible,
    // so that if this transition is interrupted, entering arcs will start
    // the next transition from the desired position.
    path.transition(t)
        .tween("data", d => {
          const i = d3.interpolate(d.current, d.target);
          return t => d.current = i(t);
        })
      .filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
        .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 
        .attrTween("d", d => () => arc(d.current));

    label.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
    tspan.filter(function(d) {
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      }).transition(t)
        .attr("fill-opacity", d => +labelVisible(d.target))
        .attrTween("transform", d => () => labelTransform(d.current));
  }
  
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  return svg;
}

function barChart(data) {

// Declare the chart dimensions and margins.
const width = 928;
const height = 500;
const marginTop = 30;
const marginRight = 0;
const marginBottom = 30;
const marginLeft = 40;

// Declare the x (horizontal position) scale.
const x = d3.scaleBand()
	.domain(d3.groupSort(data, ([d]) => -d.frequency, (d) => d.letter)) // descending frequency
	.range([marginLeft, width - marginRight])
	.padding(0.1);

// Declare the y (vertical position) scale.
const y = d3.scaleLinear()
	.domain([0, d3.max(data, (d) => d.frequency)])
	.range([height - marginBottom, marginTop]);

// Create the SVG container.
const svg = d3.create("svg")
	.attr("width", width)
	.attr("height", height)
	.attr("viewBox", [0, 0, width, height])
	.attr("style", "max-width: 100%; height: auto;");

// Add a rect for each bar.
svg.append("g")
	.attr("fill", "steelblue")
.selectAll()
.data(data)
.join("rect")
	.attr("x", (d) => x(d.letter))
	.attr("y", (d) => y(d.frequency))
	.attr("height", (d) => y(0) - y(d.frequency))
	.attr("width", x.bandwidth());

// Add the x-axis and label.
svg.append("g")
	.attr("transform", `translate(0,${height - marginBottom})`)
	.call(d3.axisBottom(x).tickSizeOuter(0));

// Add the y-axis and label, and remove the domain line.
svg.append("g")
	.attr("transform", `translate(${marginLeft},0)`)
	.call(d3.axisLeft(y).tickFormat((y) => (y * 100).toFixed()))
	.call(g => g.select(".domain").remove())
	.call(g => g.append("text")
		.attr("x", -marginLeft)
		.attr("y", 10)
		.attr("fill", "currentColor")
		.attr("text-anchor", "start")
		.text("↑ Frequency (%)"));

	
let container = document.getElementById("container")
// Append the SVG element.
container.append(svg.node());


console.log("done all")

}

let stackedBarChart = (data) => {
  // Specify the chart’s dimensions.
  const width = 928;
  const height = 500;
  const marginTop = 10;
  const marginRight = 10;
  const marginBottom = 20;
  const marginLeft = 40;

  // Determine the series that need to be stacked.
  const series = d3.stack()
      .keys(d3.union(data.map(d => d.age))) // distinct series keys, in input order
      .value(([, D], key) => D.get(key).population) // get value for each series key and stack
    (d3.index(data, d => d.state, d => d.age)); // group by stack then series key

  // Prepare the scales for positional and color encodings.
  const x = d3.scaleBand()
      .domain(d3.groupSort(data, D => -d3.sum(D, d => d.population), d => d.state))
      .range([marginLeft, width - marginRight])
      .padding(0.1);

  const y = d3.scaleLinear()
      .domain([0, d3.max(series, d => d3.max(d, d => d[1]))])
      .rangeRound([height - marginBottom, marginTop]);

  const color = d3.scaleOrdinal()
      .domain(series.map(d => d.key))
      .range(d3.schemeSpectral[series.length])
      .unknown("#ccc");

  // A function to format the value in the tooltip.
  const formatValue = x => isNaN(x) ? "N/A" : x.toLocaleString("en")

  // Create the SVG container.
  const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

  // Append a group for each series, and a rect for each element in the series.
  svg.append("g")
    .selectAll()
    .data(series)
    .join("g")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(D => D.map(d => (d.key = D.key, d)))
    .join("rect")
      .attr("x", d => x(d.data[0]))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
    .append("title")
      .text(d => `${d.data[0]} ${d.key}\n${formatValue(d.data[1].get(d.key).population)}`);

  // Append the horizontal axis.
  svg.append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .call(g => g.selectAll(".domain").remove());

  // Append the vertical axis.
  svg.append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).ticks(null, "s"))
      .call(g => g.selectAll(".domain").remove());

  // Return the chart with the color scale as a property (for the legend).
  return Object.assign(svg.node(), {scales: {color}});
}

console.log("done loading d3 script")