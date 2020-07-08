const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: [
        './src/index.js',
        './src/index.css'
    ],
    output: {
        path: __dirname + '/dist',
        publicPath: '/celestial-gps/',
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",   
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader' ]
            },
            {
                test: /\.(png|jpg)$/, 
                use: "file-loader?name=images/[name].[ext]"
            }
        ]
    },
    plugins: [    
        new HtmlWebpackPlugin({
            template: './src/index.html'
        }),
        new CopyPlugin({
          patterns: [
            { from: 'natural-earth-data', to: 'natural-earth-data' },
          ],
        })
    ]
};
