module.exports = {
    webpack: {
      configure: (webpackConfig) => {
        webpackConfig.ignoreWarnings = [
          {
            module: /node_modules\/react-datepicker/,
          },
        ];
        return webpackConfig;
      },
    },
  };

  