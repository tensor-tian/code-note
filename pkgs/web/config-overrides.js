module.exports = function override(config, env) {
  config.resolve.fallback = {
    fs: false,
    path: false,
    http: false,
    https: false,
    buffer: false,
    url: false,
  };
  if (env !== "production") {
    return config;
  }
  // disable splitting
  config.optimization.splitChunks = {
    cacheGroups: {
      default: false,
    },
  };
  config.optimization.minimize = false;
  // Move runtime into bundle instead of separate file
  // config.optimization.runtimeChunk = false;

  // https://www.cnblogs.com/skychx/p/webpack-filename-chunkFilename.html
  config.output.chunkFilename = "static/js/[name].bundle.js";
  // config.output.assetModuleFilename = "web/static/media/[name].[hash][ext]";

  return config;
};
