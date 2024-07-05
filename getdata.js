require("dotenv").config();
const fetch = require("node-fetch");
import core from "@actions/core";
const fs = require("fs");
const token = core.getInput("TOKEN");
const orgname = core.getInput("orgname"); // Thay thế bằng tên tổ chức của bạn

// Hàm để lấy dữ liệu JSON từ URL và xử lý lỗi nếu có
const fetchJSON = async (url) => {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Lỗi khi lấy dữ liệu: ${response.status}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error("Đã có lỗi xảy ra:", error.message);
  }
};

// Hàm lấy danh sách tất cả các repositories của tổ chức
const getOrgRepos = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}/repos`;
  return fetchJSON(url);
};

// Hàm lấy danh sách tất cả các commits trong khoảng thời gian từ repository
const getRepoCommits = async (orgname, repo, since, until) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/commits?since=${since}&until=${until}`;
  return fetchJSON(url);
};

// Hàm thống kê số contributions của từng member trong khoảng thời gian
const getContributionsByMember = async (orgname, since, until) => {
  const repos = await getOrgRepos(orgname);

  let contributionsByMember = {};

  for (const repo of repos) {
    try {
      const commits = await getRepoCommits(orgname, repo.name, since, until);
      if (commits) {
        commits.forEach((commit) => {
          const login = commit.author ? commit.author.login : "unknown";
          if (!contributionsByMember[login]) {
            contributionsByMember[login] = 0;
          }
          contributionsByMember[login] += 1;
        });
      } else {
        console.log(`Không có commits trong repository ${repo.name}`);
      }
    } catch (error) {
      if (error.message.includes("409")) {
        console.log(
          `Conflict error for repository ${repo.name}:`,
          error.message
        );
      } else {
        console.log(
          `Lỗi xảy ra khi lấy commits của repository ${repo.name}:`,
          error.message
        );
      }
    }
  }

  return contributionsByMember;
};

// Hàm thống kê số contributions của từng member cho mỗi tháng trong 12 tháng qua
const getContributionsLast12Months = async (orgname) => {
  let contributionsByMonth = {};

  for (let i = 0; i < 6; i++) {
    let startDate = new Date();
    startDate.setMonth(startDate.getMonth() - i - 1);
    let endDate = new Date();
    endDate.setMonth(endDate.getMonth() - i);

    let since = startDate.toISOString();
    let until = endDate.toISOString();

    contributionsByMonth[endDate.getMonth() + 1 + "/" + endDate.getFullYear()] =
      await getContributionsByMember(orgname, since, until);
  }

  return contributionsByMonth;
};

getContributionsLast12Months(orgname).then((contributionsByMonth) => {
  console.log(
    `Số contributions trong 12 tháng vừa qua của tổ chức ${orgname} theo từng member cho mỗi tháng:`
  );
  console.log(contributionsByMonth);
  saveDataToFile(contributionsByMonth);
});

// Hàm lưu biến data
const saveDataToFile = (data) => {
  try {
    fs.writeFileSync("dulieu.json", JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào tệp:", error.message);
  }
};

// Hàm kiểm tra xem có thành viên nào trong danh sách members xuất hiện trong mỗi tháng của data.by6month
const Is_memberOrg_by6month = async (data, members) => {
  // Duyệt qua từng tháng trong data.by6month
  for (const month in data) {
    const monthData = data[month];

    // Duyệt qua các thành viên để kiểm tra xem có xuất hiện trong tháng hiện tại không
    for (const member of members) {
      if (monthData.hasOwnProperty(member)) {
        return true; // Nếu có thành viên xuất hiện, trả về true
      }
    }
  }

  return false; // Nếu không có thành viên nào xuất hiện, trả về false
};
