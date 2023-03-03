import Highcharts from "highcharts";

require("highcharts/modules/exporting")(Highcharts);

Highcharts.getSVG = function (charts) {
  var svgArr = [],
    top = 0,
    width = 0;

  Highcharts.each(charts, function (chart) {
    if (chart === undefined) return;

    var svg = chart.getSVG(),
      // Get width/height of SVG for export
	   // eslint-disable-next-line
      svgWidth = +svg.match(/^<svg[^>]*width\s*=\s*\"?(\d+)\"?[^>]*>/)[1],
	   // eslint-disable-next-line
      svgHeight = +svg.match(/^<svg[^>]*height\s*=\s*\"?(\d+)\"?[^>]*>/)[1];

    svg = svg.replace("<svg", '<g transform="translate(0,' + top + ')" ');
    svg = svg.replace("</svg>", "</g>");

    top += svgHeight;
    width = Math.max(width, svgWidth);

    svgArr.push(svg);
  });

  return (
    '<svg height="' +
    top +
    '" width="' +
    width +
    '" version="1.1" xmlns="http://www.w3.org/2000/svg">' +
    svgArr.join("") +
    "</svg>"
  );
};

Highcharts.exportCharts = function (charts, options) {
  // Merge the options
  options = Highcharts.merge(Highcharts.getOptions().exporting, options);

  // Post to export server
  Highcharts.post(options.url, {
    filename: options.filename || "chart",
    type: options.type,
    width: options.width,
    svg: Highcharts.getSVG(charts)
  });
};

function exportToPdf(props) {
  Highcharts.exportCharts(Highcharts.charts, {
    type: "application/pdf"
  });
}

export default exportToPdf;
