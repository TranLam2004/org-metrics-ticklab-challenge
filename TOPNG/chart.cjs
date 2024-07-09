const { Chart, registerables } = require("chart.js");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const ChartDataLabels = require("chartjs-plugin-datalabels");

Chart.register(...registerables);

const dataFilePath = path.resolve(__dirname, "../data.json");

fs.readFile(dataFilePath, "utf8", (err, jsonString) => {
  if (err) {
    console.log("File read failed:", err);
    return;
  }
  try {
    const data = JSON.parse(jsonString);
    createLanguagesChart(data);
    createTotalCommitChart(data);
    createTotalCommitBy6MonthChart(data);
    createContributionsBy6MonthChart(data);
    createMenbersBy6MonthChart(data);
    createChart(data);
  } catch (err) {
    console.log("Error parsing JSON string:", err);
  }
});

function createLanguagesChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");

  const totalLanguages = data.totalLanguages;
  const totalLines = Object.values(totalLanguages).reduce((a, b) => a + b, 0);

  const diverseBoldColors = [
    "#B20000", // darkened red
    "#0073A5", // darkened deepskyblue
    "#B2B200", // darkened yellow
    "#B200B2", // darkened magenta
    "#483D8B", // darkened slateblue
    "#CC8400", // darkened orange
    "#00008B", // darkened mediumblue
    "#3B4B27", // darkened darkolivegreen
    "#54586B", // darkened lightslategrey
    "#701C1C", // darkened brown
    "#249324", // darkened limegreen
    "#167E7E", // darkened lightseagreen
    "#FF5733", // bold orange-red
    "#33FF57", // bold green
    "#3357FF", // bold blue
    "#FF33A1", // bold pink
    "#FFD700", // bold gold
    "#8A2BE2", // bold blueviolet
    "#DC143C", // bold crimson
    "#FF8C00", // bold darkorange
    "#32CD32", // bold limegreen
    "#8B0000", // bold darkred
    "#00CED1", // bold darkturquoise
  ];
  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  const totalLanguagesChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(totalLanguages),
      datasets: [
        {
          label: "Total Languages",
          data: Object.values(totalLanguages),
          backgroundColor: diverseBoldColors.slice(
            0,
            Object.keys(totalLanguages).length
          ),
          borderColor: diverseBoldColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "black",
            generateLabels: (chart) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label, i) => {
                  const value = data.datasets[0].data[i];
                  const total = data.datasets[0].data.reduce(
                    (acc, val) => acc + val,
                    0
                  );
                  const percentage = ((value / total) * 100).toFixed(2) + "%";
                  return {
                    text: `${label}: ${percentage}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    strokeStyle: data.datasets[0].borderColor[i],
                    lineWidth: data.datasets[0].borderWidth,
                    hidden: !chart.getDataVisibility(i),
                    index: i,
                  };
                });
              }
              return [];
            },
          },
        },
        title: {
          display: true,
          text: "Total Languages",
          color: "black",
          font: {
            size: 20,
          },
        },
      },
      layout: {
        padding: 20,
      },
    },
    plugins: [backgroundColorPlugin],
  });
  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(
    path.join(__dirname, "img", "TotalLanguages.svg"),
    svgBuffer
  );
  console.log("The SVG file was created.");
}

function createTotalCommitChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");
  const totalMemberCommits = data.totalMemberCommits;
  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  const totalCommitsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(totalMemberCommits),
      datasets: [
        {
          label: "Total Commits By Members",
          data: Object.values(totalMemberCommits),
          backgroundColor: "#B2B200",
          borderColor: "#B2B200",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "black", // Màu của các nhãn trục y
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục y
          },
        },
        x: {
          ticks: {
            color: "black", // Màu của các nhãn trục x
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục x
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "black", // Màu của nhãn trong chú thích (legend)
          },
        },
        title: {
          display: true,
          text: "Total Commits By Members",
          color: "black",
          font: {
            size: 20,
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          formatter: (value) => value,
          color: "black", // Màu của nhãn dữ liệu
        },
      },
    },
    plugins: [ChartDataLabels, backgroundColorPlugin],
  });

  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(
    path.join(__dirname, "img", "TotalMembersCommit.svg"),
    svgBuffer
  );
  console.log("The SVG file was created.");
}

function createTotalCommitBy6MonthChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");
  const totalMemberCommits = data.by6month.summary;
  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  const totalCommits6MonthChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(totalMemberCommits),
      datasets: [
        {
          label: "Total Commits By Members (Last 6 Months)",
          data: Object.values(totalMemberCommits),
          backgroundColor: "#167E7E",
          borderColor: "#167E7E",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "black", // Màu của các nhãn trục y
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục y
          },
        },
        x: {
          ticks: {
            color: "black", // Màu của các nhãn trục x
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục x
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "black", // Màu của nhãn trong chú thích (legend)
          },
        },
        title: {
          display: true,
          text: "Total Commits By Members (Last 6 Months)",
          color: "black",
          font: {
            size: 20,
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          formatter: (value) => value,
          color: "black", // Màu của nhãn dữ liệu
        },
      },
    },
    plugins: [ChartDataLabels, backgroundColorPlugin],
  });

  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(
    path.join(__dirname, "img", "TotalMembersCommitBy6Month.svg"),
    svgBuffer
  );
  console.log("The SVG file was created.");
}

function createContributionsBy6MonthChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");
  const by6month = data.by6month;
  const months = Object.keys(by6month)
    .filter((month) => month !== "summary")
    .reverse();
  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  const contributionsByOrgChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Total Contributions By ORG (Last 6 Months)",
          data: months.map((month) => by6month[month].total),
          backgroundColor: "#FF0000",
          borderColor: "#FF0000",
          borderWidth: 1,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "black", // Màu của các nhãn trục y
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục y
          },
        },
        x: {
          ticks: {
            color: "black", // Màu của các nhãn trục x
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục x
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "black", // Màu của nhãn trong chú thích (legend)
          },
        },
        title: {
          display: true,
          text: "Total Contributions By ORG (per month for the past 6 months)",
          color: "black",
          font: {
            size: 20,
          },
        },
        datalabels: {
          display: true,
          align: "top",
          anchor: "end",
          formatter: (value) => value,
          color: "black",
        },
      },
    },
    plugins: [ChartDataLabels, backgroundColorPlugin],
  });

  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(
    path.join(__dirname, "img", "TotalContributionsBy6Month.svg"),
    svgBuffer
  );
  console.log("The SVG file was created.");
}

function createMenbersBy6MonthChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");
  // Màu sắc đa dạng và đậm
  // Màu sắc đa dạng và đậm
  const diverseBoldColors = [
    "#B20000", // darkened red
    "#0073A5", // darkened deepskyblue
    "#B2B200", // darkened yellow
    "#B200B2", // darkened magenta
    "#483D8B", // darkened slateblue
    "#CC8400", // darkened orange
    "#00008B", // darkened mediumblue
    "#3B4B27", // darkened darkolivegreen
    "#54586B", // darkened lightslategrey
    "#701C1C", // darkened brown
    "#249324", // darkened limegreen
    "#167E7E", // darkened lightseagreen
    "#FF5733", // bold orange-red
    "#33FF57", // bold green
    "#3357FF", // bold blue
    "#FF33A1", // bold pink
    "#FFD700", // bold gold
    "#8A2BE2", // bold blueviolet
    "#DC143C", // bold crimson
    "#FF8C00", // bold darkorange
    "#32CD32", // bold limegreen
    "#8B0000", // bold darkred
    "#00CED1", // bold darkturquoise
  ];

  // Chuẩn bị dữ liệu cho biểu đồ cột xếp chồng
  const months = Object.keys(data.by6month).filter(
    (month) => month !== "summary"
  );
  const teams = Object.keys(data.by6month[months[0]]).filter(
    (team) => team !== "total"
  );

  const datasets = teams.map((team, index) => ({
    label: team,
    data: months.map((month) => data.by6month[month][team]),
    backgroundColor: diverseBoldColors[index % diverseBoldColors.length],
    borderColor: diverseBoldColors[index % diverseBoldColors.length],
    borderWidth: 1,
  }));

  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  // Tạo biểu đồ sử dụng Chart.js
  const stackedBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: datasets,
    },
    options: {
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: "black", // Màu của các nhãn trục y
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục y
          },
        },
        x: {
          stacked: true,
          ticks: {
            color: "black", // Màu của các nhãn trục x
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục x
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "black", // Màu của nhãn trong chú thích (legend)
          },
        },
        title: {
          display: true,
          text: "Commits by Members  (per month for the past 6 months)",
          color: "black",
          font: {
            size: 20,
          },
        },
        datalabels: {
          display: true,
          color: "black",
          formatter: (value) => value,
        },
      },
    },
    plugins: [ChartDataLabels, backgroundColorPlugin],
  });
  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(
    path.join(__dirname, "img", "MemberCommitBy6Month.svg"),
    svgBuffer
  );
  console.log("The SVG file was created.");
}

function createChart(data) {
  const canvas = createCanvas(600, 400, "svg");
  const ctx = canvas.getContext("2d");
  const labels = [
    "Total Stars",
    "Total PRs",
    "Total Merged PRs",
    "Total Contributions",
  ];
  const values = [
    data.totalStars,
    data.totalPRs,
    data.totalMergedPRs,
    data.totalContributions,
  ];
  // Thêm plugin vẽ nền
  const backgroundColorPlugin = {
    id: "customCanvasBackgroundColor",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "white"; // Màu nền của ảnh
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };

  const totalChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Information",
          data: values,
          backgroundColor: "#249324",
          borderColor: "#249324",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: "black", // Màu của các nhãn trục y
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục y
          },
        },
        x: {
          ticks: {
            color: "black", // Màu của các nhãn trục x
          },
          grid: {
            color: "black", // Màu của các đường kẻ lưới trục x
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: "black", // Màu của nhãn trong chú thích (legend)
          },
        },
        title: {
          display: true,
          text: "Total Information",
          color: "black",
          font: {
            size: 20,
          },
        },
        datalabels: {
          display: true,
          align: "end",
          anchor: "end",
          formatter: (value) => value,
          color: "black", // Màu của nhãn dữ liệu
        },
      },
    },
    plugins: [ChartDataLabels, backgroundColorPlugin],
  });
  // Lưu biểu đồ vào file .svg
  const svgBuffer = canvas.toBuffer("image/svg+xml");
  fs.writeFileSync(path.join(__dirname, "img", "Information.svg"), svgBuffer);
  console.log("The SVG file was created.");
}
