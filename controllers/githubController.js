const db = require("../db/db");
const { fetchGithubProfile } = require("../services/githubService");

const analyzeProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const profile = await fetchGithubProfile(username);

    const accountAgeYears =
      new Date().getFullYear() -
      new Date(profile.created_at).getFullYear();

    const profileScore =
      profile.followers +
      (profile.public_repos * 5) +
      (profile.public_gists * 2);

    let github_rank;
    if (profileScore > 50000) {
      github_rank = "Expert";
    } else if (profileScore > 10000) {
      github_rank = "Advanced";
    } else {
      github_rank = "Beginner";
    }

    const sql = `
      INSERT INTO profiles (
        username,
        name,
        followers,
        following,
        public_repos,
        public_gists,
        account_created,
        profile_url,
        profile_score,
        github_rank,
        account_age_years
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      followers = VALUES(followers),
      following = VALUES(following),
      public_repos = VALUES(public_repos),
      public_gists = VALUES(public_gists),
      profile_url = VALUES(profile_url),
      profile_score = VALUES(profile_score),
      github_rank = VALUES(github_rank),
      account_age_years = VALUES(account_age_years)
    `;

    db.query(
      sql,
      [
        profile.login,
        profile.name,
        profile.followers,
        profile.following,
        profile.public_repos,
        profile.public_gists,
        profile.created_at.split("T")[0],
        profile.html_url,
        profileScore,
        github_rank,
        accountAgeYears,
      ],
      (err) => {
        if (err) {
          return res.status(500).json({
            error: err.message,
          });
        }

        res.json({
          success: true,
          profile,
          insights: {
            profileScore,
            github_rank,
            accountAgeYears,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

const getAllProfiles = (req, res) => {
  db.query("SELECT * FROM profiles", (err, results) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
      });
    }

    res.json(results);
  });
};

const getProfileByUsername = (req, res) => {
  const { username } = req.params;

  db.query(
    "SELECT * FROM profiles WHERE username = ?",
    [username],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          error: err.message,
        });
      }

      if (results.length === 0) {
        return res.status(404).json({
          message: "Profile not found",
        });
      }

      res.json(results[0]);
    }
  );
};

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getProfileByUsername,
};