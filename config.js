const dotenv = require('dotenv');
dotenv.config();
module.exports = {
    MS_TEAM_BOTS_CHANNEL_TOKENS: process.env.MS_TEAM_BOTS_CHANNEL_TOKENS,
    MS_TEAM_BOTS_OPSGENIE_TOKEN: process.env.MS_TEAM_BOTS_OPSGENIE_TOKEN,
    PORT: process.env.port || process.env.PORT || 8080,
};
