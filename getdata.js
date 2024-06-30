const fs = require("fs");
const fetch = require("node-fetch"); // Đảm bảo bạn đã cài đặt node-fetch
const orgname = "TickLabVN";

// Hàm để lấy dữ liệu JSON từ URL và xử lý lỗi nếu có
const fetchJSON = async (url) => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!response.ok) {
    throw new Error(`Lỗi khi lấy dữ liệu: ${response.status}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

// Các hàm để lấy thông tin từ GitHub API
const getORGInfo = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}`;
  return fetchJSON(url);
};

//Hàm lấy repo
const getORGRepos = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}/repos`;
  return fetchJSON(url);
};

//Hàm lấy contributions từ repo
const getRepoContributors = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/contributors`;
  return fetchJSON(url);
};

//Hàm lấy languages từ repo
const getRepoLanguages = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/languages`;
  return fetchJSON(url);
};

//Hàm lấy commit từ repo
const getRepoCommits = async (orgname, repo) => {
  let commits = [];
  let page = 1;
  const perPage = 100;
  let url = `https://api.github.com/repos/${orgname}/${repo}/commits?per_page=${perPage}&page=${page}`;

  while (true) {
    const newCommits = await fetchJSON(url);
    if (newCommits.length === 0) {
      break;
    }
    commits = commits.concat(newCommits);
    page++;
    url = `https://api.github.com/repos/${orgname}/${repo}/commits?per_page=${perPage}&page=${page}`;
  }

  return commits;
};

//Hàm lấy members
const getORGmembers = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}/members`;
  return fetchJSON(url);
};

//Khởi tạo data
let data = {};
//Hàm lưu biến data
const saveDataToFile = () => {
  fs.writeFileSync("dulieu.json", JSON.stringify(data, null, 2), "utf-8");
};

// Lấy thông tin tổ chức và lưu vào file
getORGInfo(orgname).then((info) => {
  //console.log(info);
  //data.info = info;

  data.info = {
    login: info.login,
    avatar_url: info.avatar_url,
    description: info.description,
    blog: info.blog,
    location: info.location,
    email: info.email,
    public_repos: info.public_repos,
    public_gists: info.public_gists,
    followers: info.followers,
    following: info.following,
    created_at: info.created_at,
    updated_at: info.updated_at,
    type: info.type,
    company: info.company,
    name: info.name,
    twitter_username: info.twitter_username,
  };

  saveDataToFile();
});

// Lấy danh sách thành viên và lưu vào file
data.members = [];
getORGmembers(orgname).then((members) => {
  data.members = members.map((member) => member.login); // Chỉ lấy thuộc tính login
  saveDataToFile();
});

// Lấy thông tin các repo và xử lý dữ liệu
data = { repos: {} };
let totalContributions = 0;
let totalLanguages = {};

getORGRepos(orgname)
  .then(async (repos) => {
    if (repos) {
      for (const repo of repos) {
        let totalContributions = 0;
        let languages = {};
        let memberCommits = {};

        // Lấy thông tin contributors
        const contributors = await getRepoContributors(orgname, repo.name);
        if (Array.isArray(contributors)) {
          contributors.forEach((contributor) => {
            totalContributions += contributor.contributions;
            memberCommits[contributor.login] =
              (memberCommits[contributor.login] || 0) +
              contributor.contributions;
          });
          totalContributions += repoContributions;
        } else {
          console.warn(
            `Định dạng contributors không mong đợi cho repo ${repo.name}:`,
            contributors
          );
        }

        // Lấy thông tin languages
        const repoLanguages = await getRepoLanguages(orgname, repo.name);
        if (repoLanguages) {
          for (const [language, lines] of Object.entries(repoLanguages)) {
            languages[language] = (languages[language] || 0) + lines;
            totalLanguages[language] = (totalLanguages[language] || 0) + lines;
          }
        }

        // Lưu thông tin vào data
        data.repos[repo.name] = {
          contributions: totalContributions,
          languages: languages,
          memberCommits: memberCommits,
        };
      }

      data.totalContributions = totalContributions;
      data.totalLanguages = totalLanguages;
      saveDataToFile(data);
    }
  })
  .catch((error) => {
    console.error(`Lỗi khi xử lý các repo: ${error.message}`);
  });
