var webpack = require('webpack');
var path = require('path');
var slugify = require('transliteration').slugify;
var striptags = require('./strip-tags');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var getPostcssPlugin = require('./utils/postcss_pipe');
var ProgressBarPlugin = require('progress-bar-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const isProduction = process.env.NODE_ENV === 'production';
const watchExample = require('./genExamples');

if (!isProduction) {
  watchExample();  
}

var StyleExtractPlugin;
if (process.env.NODE_ENV === 'production') {
  StyleExtractPlugin = new ExtractTextPlugin('[name].[hash:8].css');
} else {
  StyleExtractPlugin = new ExtractTextPlugin('[name].css');
}

function convert(str) {
  str = str.replace(/(&#x)(\w{4});/gi, function($0) {
    return String.fromCharCode(parseInt(encodeURIComponent($0).replace(/(%26%23x)(\w{4})(%3B)/g, '$2'), 16));
  });
  return str;
}

function wrap(render) {
  return function() {
    return render.apply(this, arguments)
      .replace(/\<code v-pre class=\"/, '<code v-pre class="hljs ');
  };
};

module.exports = {
  entry: {
    'vendor': ['vue', 'vue-router', 'zan-doc'],
    'vant-docs': './docs/src/index.js',
    'vant-examples': './docs/src/examples.js'
  },
  output: {
    path: path.join(__dirname, '../docs/dist'),
    publicPath: '/',
    filename: '[name].js',
    umdNamedDefine: true
  },
  devServer: {
    historyApiFallback: {
      rewrites: [
        { from: /^\/zanui\/vue\/examples/, to: '/examples.html' },
        { from: /^\/zanui\/vue/, to: '/index.html' }
      ]
    }
  },
  resolve: {
    modules: [
      path.join(__dirname, '../node_modules'),
      'node_modules'
    ],
    extensions: ['.js', '.vue', '.css'],
    alias: {
      'vue$': 'vue/dist/vue.runtime.common.js',
      'src': path.join(__dirname, '../src'),
      'packages': path.join(__dirname, '../packages'),
      'lib': path.join(__dirname, '../lib'),
      'components': path.join(__dirname, '../docs/src/components')
    }
  },
  module: {
    loaders: [
      {
        test: /\.vue$/,
        use: [{
          loader: 'vue-loader',
          options: {
            loaders: {
              css: ExtractTextPlugin.extract({
                use: 'css-loader!postcss-loader',
                fallback: 'vue-style-loader'
              })
            }
          }
        }]
      },
      {
        test: /\.js$/,
        exclude: /node_modules|vue-router\/|vue-loader\/|vue-hot-reload-api\//,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: 'css-loader!postcss-loader'
        })
      },
      {
        test: /\.md/,
        loader: 'vue-markdown-loader'
      },
      {
        test: /\.(woff2?|eot|ttf|otf|svg)(\?.*)?$/,
        loader: 'url-loader'
      }
    ]
  },
  devtool: 'source-map',
  plugins: [
    new ProgressBarPlugin(),
    new webpack.LoaderOptionsPlugin({
      minimize: true,
      options: {
        postcss: getPostcssPlugin,
        babel: {
          presets: ['es2015'],
          plugins: ['transform-runtime', 'transform-vue-jsx']
        },
        vue: {
          autoprefixer: false,
          postcss: getPostcssPlugin
        },
        vueMarkdown: {
          use: [
            [require('markdown-it-container'), 'demo', {
              validate: function(params) {
                return params.trim().match(/^demo\s*(.*)$/);
              },

              render: function(tokens, idx) {
                if (tokens[idx].nesting === 1) {
                  return `<demo-block class="demo-box"><div class="highlight" slot="highlight">`;
                }
                return `</div></demo-block>\n`;
              }
            }]
          ],
          preprocess: function(MarkdownIt, source) {
            MarkdownIt.renderer.rules.table_open = function() {
              return '<table class="zan-doc-table">';
            };
            return source;
          }
        }
      }
    }),
    new HtmlWebpackPlugin({
      chunks: ['vendor', 'vant-docs'],
      template: 'docs/src/index.tpl',
      filename: 'index.html',
      inject: true
    }),
    new HtmlWebpackPlugin({
      chunks: ['vendor', 'vant-examples'],
      template: 'docs/src/index.tpl',
      filename: 'examples.html',
      inject: true
    }),
    new webpack.HotModuleReplacementPlugin(),
    new OptimizeCssAssetsPlugin(),
    StyleExtractPlugin,
    new FriendlyErrorsPlugin()
  ]
};
