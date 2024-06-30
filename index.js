require("dotenv").config();
const fetch = require("node-fetch");
const fs = require("fs");
const token = process.env.TOKEN;
const orgname = "TickLabVN";

// Hàm để lấy dữ liệu JSON từ URL và xử lý lỗi nếu có
const fetchJSON = async (url) => {
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
};

// Các hàm để lấy thông tin từ GitHub API
const getORGInfo = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}`;
  return fetchJSON(url);
};

// Hàm lấy repo
const getORGRepos = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}/repos`;
  return fetchJSON(url);
};

// Hàm lấy contributions từ repo
const getRepoContributors = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/contributors`;
  return fetchJSON(url);
};

// Hàm lấy languages từ repo
const getRepoLanguages = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/languages`;
  return fetchJSON(url);
};

// Hàm lấy stars từ repo
const getRepoStars = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}`;
  const repoData = await fetchJSON(url);
  return repoData.stargazers_count;
};

// Hàm lấy pull requests từ repo
const getRepoPullRequests = async (orgname, repo) => {
  const url = `https://api.github.com/repos/${orgname}/${repo}/pulls?state=all`;
  const pulls = await fetchJSON(url);
  return pulls.length;
};

// Hàm lấy merged pull requests từ repo
const getRepoMergedPullRequests = async (orgname, repo) => {
  let mergedPRs = 0;
  let page = 1;
  const perPage = 100;
  let url = `https://api.github.com/repos/${orgname}/${repo}/pulls?state=closed&per_page=${perPage}&page=${page}`;

  while (true) {
    const pulls = await fetchJSON(url);
    if (pulls.length === 0) {
      break;
    }
    pulls.forEach((pr) => {
      if (pr.merged_at) {
        mergedPRs++;
      }
    });
    page++;
    url = `https://api.github.com/repos/${orgname}/${repo}/pulls?state=closed&per_page=${perPage}&page=${page}`;
  }

  return mergedPRs;
};

// Hàm lấy commit từ repo
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

// Hàm lấy members
const getORGmembers = async (orgname) => {
  const url = `https://api.github.com/orgs/${orgname}/members`;
  return fetchJSON(url);
};

const Is_memberOrg = async (repos, members) => {
  // Duyệt qua tất cả các repo
  for (const repo in repos) {
    // Lấy danh sách memberCommits của repo hiện tại
    const memberCommits = repos[repo].memberCommits;

    // Kiểm tra xem có ít nhất một member trong danh sách members có xuất hiện trong memberCommits không
    for (const member of members) {
      if (memberCommits.hasOwnProperty(member)) {
        return true; // Nếu có ít nhất một member xuất hiện, trả về true
      }
    }
  }

  return false; // Nếu không có member nào xuất hiện, trả về false
};

//Hàm xử lý dữ liệu
const UpdateData = async (data) => {
  const updatedRepos = {};
  let totalStars = 0;
  let totalPRs = 0;
  let totalMergedPRs = 0;
  let totalContributions = 0;
  let totalLanguages = {};
  let totalMemberCommits = {};

  for (const member of data.members) {
    totalMemberCommits[member] = 0;
  }

  for (const repo in data.repos) {
    const repoData = data.repos[repo];

    // Kiểm tra xem repo có ít nhất một member trong members không
    const isMemberOrg = await Is_memberOrg({ [repo]: repoData }, data.members);

    if (isMemberOrg) {
      // Chỉ giữ lại những người có trong data.members
      const filteredMemberCommits = {};
      for (const member of data.members) {
        if (repoData.memberCommits.hasOwnProperty(member)) {
          filteredMemberCommits[member] = repoData.memberCommits[member];
          totalMemberCommits[member] += repoData.memberCommits[member];
        }
      }

      // Tính tổng contributions cho repo hiện tại
      const repoContributions = Object.values(filteredMemberCommits).reduce(
        (sum, contributions) => sum + contributions,
        0
      );

      // Cập nhật thông tin repo trong updatedRepos
      updatedRepos[repo] = {
        contributions: repoContributions,
        languages: repoData.languages,
        memberCommits: filteredMemberCommits,
        stars: repoData.stars,
        pullRequests: repoData.pullRequests,
        mergedPullRequests: repoData.mergedPullRequests,
      };

      // Cộng dồn vào tổng số liệu
      totalStars += repoData.stars;
      totalPRs += repoData.pullRequests;
      totalMergedPRs += repoData.mergedPullRequests;
      totalContributions += repoContributions;

      for (const [language, lines] of Object.entries(repoData.languages)) {
        totalLanguages[language] = (totalLanguages[language] || 0) + lines;
      }
    }
  }

  // Cập nhật lại data với các tổng số liệu mới
  data.repos = updatedRepos;
  data.totalStars = totalStars;
  data.totalPRs = totalPRs;
  data.totalMergedPRs = totalMergedPRs;
  data.totalContributions = totalContributions;
  data.totalLanguages = totalLanguages;
  data.totalMemberCommits = totalMemberCommits;
  saveDataToFile(data);
};

// Hàm lưu biến data
const saveDataToFile = (data) => {
  fs.writeFileSync("data.json", JSON.stringify(data, null, 2), "utf-8");
};

// Khởi tạo data
let data = {};
// Lấy thông tin tổ chức và lưu vào file
getORGInfo(orgname)
  .then((info) => {
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

    saveDataToFile(data);

    // Lấy danh sách thành viên và lưu vào file
    return getORGmembers(orgname);
  })
  .then((members) => {
    data.members = members.map((member) => member.login); // Chỉ lấy thuộc tính login
    saveDataToFile(data);

    // Lấy thông tin các repo và xử lý dữ liệu
    return getORGRepos(orgname);
  })
  .then(async (repos) => {
    data.repos = {};

    if (repos) {
      for (const repo of repos) {
        let repoContributions = 0;
        let repoLanguages = {};
        let memberCommits = {};
        let repoStars = 0;
        let repoPRs = 0;
        let repoMergedPRs = 0;

        // Lấy thông tin contributors
        const contributors = await getRepoContributors(orgname, repo.name);
        if (Array.isArray(contributors)) {
          contributors.forEach((contributor) => {
            repoContributions += contributor.contributions;
            memberCommits[contributor.login] =
              (memberCommits[contributor.login] || 0) +
              contributor.contributions;
          });
        } else {
          console.warn(
            `Định dạng contributors không mong đợi cho repo ${repo.name}:`,
            contributors
          );
        }

        // Lấy thông tin languages
        const languages = await getRepoLanguages(orgname, repo.name);
        if (languages) {
          for (const [language, lines] of Object.entries(languages)) {
            repoLanguages[language] = (repoLanguages[language] || 0) + lines;
          }
        }

        // Lấy số sao của repo
        repoStars = await getRepoStars(orgname, repo.name);

        // Lấy số PR của repo
        repoPRs = await getRepoPullRequests(orgname, repo.name);

        // Lấy số PR đã merge của repo
        repoMergedPRs = await getRepoMergedPullRequests(orgname, repo.name);

        // Lưu thông tin vào data
        data.repos[repo.name] = {
          contributions: repoContributions,
          languages: repoLanguages,
          memberCommits: memberCommits,
          stars: repoStars,
          pullRequests: repoPRs,
          mergedPullRequests: repoMergedPRs,
        };
      }

      await UpdateData(data); // Cập nhật dữ liệu sau khi lấy tất cả thông tin repo
      saveDataToFile(data); // Lưu dữ liệu sau khi cập nhật
    }
  })
  .catch((error) => {
    console.error(`Lỗi khi xử lý các repo: ${error.message}`);
  });
