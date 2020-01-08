module.exports = {
  staticFileGlobs: [
    'build/index.html',
    'build/static/css/**.css',
    'build/static/js/**.js'
  ],
  swFilePath: './build/service-worker.js',
  stripPrefix: 'build/',
}
