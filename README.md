# gatsby-source-wakatime

A Gatsby Source to import your data from the [WakaTime](https://wakatime.com) API.

This source requires your WakaTime API Key which can be found in your [account settings](https://wakatime.com/settings/account).

> **NOTE**
>
> If you are on the **FREE** tier on Wakatime, you are limited to a maxium of 14 days of data.

## Getting Started

1. Install the package with **yarn** or **npm**

`yarn add gatsby-source-wakatime`

2. Add to plugins in your gatsby-config.js

```javascript
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-wakatime",
            options: {
                apiKey: ""
            }
        }
    ]
};
```

### Optional Settings

```javascript
module.exports = {
    plugins: [
        {
            resolve: "gatsby-source-wakatime",
            options: {
                baseURL: "https://wakatime.com/api/v1",
                apiKey: "",
                timespan: "7day" // any timespan acceptable by the `ms` module
        }
    ]
};
```

## Contributing

Every contribution is very much appreciated.
Feel free to file bugs, feature- and pull-requests.

❤️ If this plugin is helpful for you, star it on [GitHub](https://github.com/codevachon/gatsby-source-wakatime).
