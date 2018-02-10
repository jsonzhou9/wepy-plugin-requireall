'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _class = function () {
    function _class() {
        var c = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        _classCallCheck(this, _class);

        var def = {
            src: 'src', //源文件目录
            dist: 'dist', //目标文件目录
            sourceMap: true,
            filter: new RegExp('\w$'),
            rule: RegExp('\\$BuildRequireAll\\(.+\\)')
        };

        this.setting = Object.assign({}, def, c);
    }

    _createClass(_class, [{
        key: 'apply',
        value: function apply(op) {

            var setting = this.setting;

            //获取源路径
            var distRelativePath = _path2.default.relative(process.cwd(), op.file); //目标文件相对路径
            var sourceFile = _path2.default.join(this.setting.src, distRelativePath.substring(this.setting.dist.length)); //对应的源文件路径

            if (!setting.filter.test(sourceFile)) {
                op.next();
                return;
            }

            var fileContent = this.readFile(sourceFile, op.error);
            if (!setting.rule.test(fileContent)) {
                op.next();
                return;
            }

            //仅查找当前文件中第一个匹配的$BuildRequireAll方法
            var res = fileContent.match(setting.rule);
            if (!res || !res.length) {
                op.next();
                return;
            }

            var $BuildRequireAllStr = res[0];
            $BuildRequireAllStr = $BuildRequireAllStr.replace(/\'/gi, '"'); //参数统一转为双引号
            var buildArgs = $BuildRequireAllStr.match(/\"[^\"]+\"/gi); //提取参数，结果带有双引号
            if (!buildArgs || !buildArgs.length) {
                //参数为空，不合法
                op.next();
                return;
            }

            buildArgs = buildArgs.map(function (item) {
                return item.replace(/"/gi, '');
            }); //去除参数的双引号
            var spath = _path2.default.parse(sourceFile); //源路径
            var modulesShortPath = buildArgs[0];
            var modulesSourcePath = _path2.default.join(spath.dir, modulesShortPath);

            //读取子模块文件列表，并对文件类型及目录类型进行过滤
            var fileList = _fs2.default.readdirSync(modulesSourcePath);
            var modulesFileType = null;
            if (buildArgs.length === 2) {
                modulesFileType = buildArgs[1].startsWith('.') ? buildArgs[1] : '.' + buildArgs[1];
            }
            fileList = fileList.filter(function (file) {
                var stat = _fs2.default.lstatSync(_path2.default.join(modulesSourcePath, file));
                if (modulesFileType) {
                    return !stat.isDirectory();
                } else {
                    return !stat.isDirectory() && new RegExp(modulesFileType + '$').test(file);
                }
            });

            var exportArr = [],
                importArr = [];
            fileList.forEach(function (file, index, arr) {
                var moduleName = file.substring(0, file.indexOf('.'));
                var modulePath = modulesShortPath + '/' + file;
                importArr.push("import " + moduleName + " from '" + modulePath + "'");
                exportArr.push(moduleName);
            });
            var es6Code = importArr.join(';') + ';export {' + exportArr.join(',') + '}';

            op.output && op.output({
                action: '批量导入模块',
                file: op.file
            });

            var code = this.transformEs5(es6Code, spath.name);
            op.code = code;

            op.next();
        }
    }, {
        key: 'transformEs5',
        value: function transformEs5(es6Code, fileName) {
            var compileResult = null;
            var code = es6Code;
            try {
                compileResult = require("babel-core").transform(es6Code, {
                    sourceMap: this.setting.sourceMap,
                    presets: ["env"],
                    plugins: ['transform-export-extensions']
                });
            } catch (e) {}

            if (compileResult && compileResult.code) {
                code = compileResult.code;
                var sourceMap = compileResult.map;
                if (sourceMap) {
                    sourceMap.sources = [fileName];
                    sourceMap.file = fileName;
                    var Base64 = require('js-base64').Base64;
                    code += '\r\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + Base64.encode(JSON.stringify(sourceMap));
                }
            }
            return code;
        }
    }, {
        key: 'readFile',
        value: function readFile(file, error) {
            var fileContent = '';
            try {
                fileContent = _fs2.default.readFileSync(file, 'utf8');
            } catch (e) {
                error && error({ err: '文件读取出错', file: file });
            }
            return fileContent;
        }
    }]);

    return _class;
}();

exports.default = _class;
//# sourceMappingURL=index.js.map