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

// Hàm kiểm tra xem một member có thuộc org hay không
const isMemberOfOrg = (memberLogin, members) => {
  return members.some((member) => member.login === memberLogin);
};

// Hàm cập nhật dữ liệu cho repo
const updateRepoData = async (repo, members) => {
  let repoData = {
    contributions: 0,
    languages: {},
    memberCommits: {},
    stars: 0,
    pullRequests: 0,
    mergedPullRequests: 0,
  };

  // Lấy thông tin contributors
  const contributors = await getRepoContributors(orgname, repo.name);
  if (Array.isArray(contributors)) {
    contributors.forEach((contributor) => {
      repoData.contributions += contributor.contributions;
      if (isMemberOfOrg(contributor.login, members)) {
        repoData.memberCommits[contributor.login] = contributor.contributions;
      }
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
      repoData.languages[language] = lines;
    }
  }

  // Lấy số sao của repo
  repoData.stars = await getRepoStars(orgname, repo.name);

  // Lấy số PR của repo
  repoData.pullRequests = await getRepoPullRequests(orgname, repo.name);

  // Lấy số PR đã merge của repo
  repoData.mergedPullRequests = await getRepoMergedPullRequests(
    orgname,
    repo.name
  );

  return repoData;
};

// Hàm cập nhật dữ liệu chung
const updateData = async (orgname, repos, members) => {
  let updatedData = {
    repos: {},
    totalStars: 0,
    totalPRs: 0,
    totalMergedPRs: 0,
    totalContributions: 0,
    totalLanguages: {},
    totalMemberCommits: {},
  };

  for (const member of members) {
    updatedData.totalMemberCommits[member.login] = 0;
  }

  for (const repo of repos) {
    const repoData = await updateRepoData(repo, members);

    // Cập nhật thông tin repo trong updatedData
    updatedData.repos[repo.name] = {
      contributions: repoData.contributions,
      languages: repoData.languages,
      memberCommits: repoData.memberCommits,
      stars: repoData.stars,
      pullRequests: repoData.pullRequests,
      mergedPullRequests: repoData.mergedPullRequests,
    };

    // Cộng dồn vào tổng số liệu
    updatedData.totalStars += repoData.stars;
    updatedData.totalPRs += repoData.pullRequests;
    updatedData.totalMergedPRs += repoData.mergedPullRequests;
    updatedData.totalContributions += repoData.contributions;

    for (const [language, lines] of Object.entries(repoData.languages)) {
      updatedData.totalLanguages[language] =
        (updatedData.totalLanguages[language] || 0) + lines;
    }

    for (const [memberLogin, memberCommits] of Object.entries(
      repoData.memberCommits
    )) {
      updatedData.totalMemberCommits[memberLogin] += memberCommits;
    }
  }

  return updatedData;
};

// Hàm lấy commit từ repo và lọc theo thời gian trong 6 tháng gần nhất
const getMonthlyCommits = async (orgname, repo) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  let commits = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `https://api.github.com/repos/${orgname}/${repo}/commits?per_page=${perPage}&page=${page}`;
    const newCommits = await fetchJSON(url);
    if (newCommits.length === 0) {
      break;
    }

    newCommits.forEach((commit) => {
      const commitDate = new Date(commit.commit.author.date);
      if (commitDate >= sixMonthsAgo) {
        commits.push(commit);
      }
    });

    page++;
  }

  return commits;
};

// Hàm lấy commit theo tháng cho từng member trong 6 tháng gần nhất
const getCommitStats = async (orgname, repos, members) => {
  let memberMonthlyCommits = {};

  // Khởi tạo dữ liệu
  members.forEach((member) => {
    memberMonthlyCommits[member.login] = Array(6).fill(0); // Mỗi phần tử tương ứng với một tháng
  });

  // Duyệt qua tất cả các repo
  for (const repo of repos) {
    const commits = await getMonthlyCommits(orgname, repo.name);

    commits.forEach((commit) => {
      const commitDate = new Date(commit.commit.author.date);
      const monthDiff = new Date().getMonth() - commitDate.getMonth();
      const monthIndex = 5 - monthDiff;

      if (monthIndex >= 0 && monthIndex < 6) {
        const author = commit.author
          ? commit.author.login
          : commit.commit.author.name;
        if (members.some((member) => member.login === author)) {
          memberMonthlyCommits[author][monthIndex]++;
        }
      }
    });
  }

  return memberMonthlyCommits;
};

// Hàm lưu biến data
const saveDataToFile = (data) => {
  fs.writeFileSync("dulieu.json", JSON.stringify(data, null, 2), "utf-8");
};

// Thực hiện các bước lấy dữ liệu và cập nhật
const fetchDataAndUpdate = async () => {
  try {
    let data = {};

    // Lấy thông tin tổ chức và lưu vào file
    const orgInfo = await getORGInfo(orgname);
    data.info = {
      login: orgInfo.login,
      avatar_url: orgInfo.avatar_url,
      description: orgInfo.description,
      blog: orgInfo.blog,
      location: orgInfo.location,
      email: orgInfo.email,
      public_repos: orgInfo.public_repos,
      public_gists: orgInfo.public_gists,
      followers: orgInfo.followers,
      following: orgInfo.following,
      created_at: orgInfo.created_at,
      updated_at: orgInfo.updated_at,
      type: orgInfo.type,
      company: orgInfo.company,
      name: orgInfo.name,
      twitter_username: orgInfo.twitter_username,
    };

    saveDataToFile(data);

    // Lấy danh sách thành viên và lưu vào file
    const members = await getORGmembers(orgname);
    data.members = members;

    // Lấy thông tin các repo và xử lý dữ liệu
    const repos = await getORGRepos(orgname);
    const updatedData = await updateData(orgname, repos, members);
    data.repos = updatedData.repos;
    data.totalStars = updatedData.totalStars;
    data.totalPRs = updatedData.totalPRs;
    data.totalMergedPRs = updatedData.totalMergedPRs;
    data.totalContributions = updatedData.totalContributions;
    data.totalLanguages = updatedData.totalLanguages;
    data.totalMemberCommits = updatedData.totalMemberCommits;

    // Lấy thông tin commit theo tháng
    const memberMonthlyCommits = await getCommitStats(orgname, repos, members);
    data.memberMonthlyCommits = memberMonthlyCommits;

    saveDataToFile(data); // Lưu dữ liệu sau khi cập nhật
  } catch (error) {
    console.error(
      `Lỗi khi thực hiện các bước lấy dữ liệu và cập nhật: ${error.message}`
    );
  }
};

// Gọi hàm để thực hiện lấy dữ liệu và cập nhật
fetchDataAndUpdate();
