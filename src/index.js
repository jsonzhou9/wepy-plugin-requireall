import path from 'path';
import fs from 'fs';

export default class {

    constructor(c = {}) {
        const def = {
            src: 'src', //源文件目录
            dist: 'dist', //目标文件目录
            sourceMap: true,
            filter: new RegExp('\w$'),
            rule: RegExp('\\$BuildRequireAll\\(.+\\)')
        };

        this.setting = Object.assign({}, def, c);
    }

    apply (op) {

        let setting = this.setting;

        //获取源路径
        let distRelativePath = path.relative(process.cwd(), op.file); //目标文件相对路径
        let sourceFile = path.join(this.setting.src, distRelativePath.substring(this.setting.dist.length)); //对应的源文件路径

        if (!setting.filter.test(sourceFile)) {
            op.next();
            return;
        }

        let fileContent = this.readFile(sourceFile,op.error);
        if(!setting.rule.test(fileContent)){
            op.next();
            return;
        }

        //仅查找当前文件中第一个匹配的$BuildRequireAll方法
        let res = fileContent.match(setting.rule);
        if(!res || !res.length){
            op.next();
            return;
        }

        let $BuildRequireAllStr = res[0];
        $BuildRequireAllStr = $BuildRequireAllStr.replace(/\'/gi,'"'); //参数统一转为双引号
        let buildArgs = $BuildRequireAllStr.match(/\"[^\"]+\"/gi); //提取参数，结果带有双引号
        if(!buildArgs || !buildArgs.length){ //参数为空，不合法
            op.next();
            return;
        }

        buildArgs = buildArgs.map((item) => item.replace(/"/gi,'')); //去除参数的双引号
        let spath = path.parse(sourceFile); //源路径
        let modulesShortPath = buildArgs[0];
        let modulesSourcePath = path.join(spath.dir, modulesShortPath);

        //读取子模块文件列表，并对文件类型及目录类型进行过滤
        let fileList = fs.readdirSync(modulesSourcePath);
        let modulesFileType = null;
        if(buildArgs.length===2){
            modulesFileType = buildArgs[1].startsWith('.') ? buildArgs[1] : '.'+buildArgs[1];
        }
        fileList = fileList.filter(function(file) {
            let stat = fs.lstatSync(path.join(modulesSourcePath,file));
            if(modulesFileType){
                return !stat.isDirectory();
            }else{
                return !stat.isDirectory() && new RegExp(modulesFileType+'$').test(file);
            }
        });

        let exportArr = [],importArr = [];
        fileList.forEach(function(file, index, arr){
            let moduleName = file.substring(0,file.indexOf('.'));
            let modulePath = modulesShortPath+'/'+file;
            importArr.push("import "+moduleName+" from '"+modulePath+"'");
            exportArr.push(moduleName);
        });
        let es6Code = importArr.join(';') + ';export {' + exportArr.join(',') + '}';

        op.output && op.output({
            action: '批量导入模块',
            file: op.file
        });

        let code = this.transformEs5(es6Code,spath.name);
        op.code = code;

        op.next();
    }

    transformEs5 (es6Code,fileName) {
        let compileResult = null;
        let code = es6Code;
        try{
            compileResult = require("babel-core").transform(es6Code, {
                sourceMap: this.setting.sourceMap,
                presets: ["env"],
                plugins: [
                    'transform-export-extensions'
                ]
            });
        }catch (e){
        }

        if(compileResult && compileResult.code){
            code = compileResult.code;
            let sourceMap = compileResult.map;
            if (sourceMap) {
                sourceMap.sources = [fileName];
                sourceMap.file = fileName;
                let Base64 = require('js-base64').Base64;
                code += `\r\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Base64.encode(JSON.stringify(sourceMap))}`;
            }
        }
        return code;
    }

    readFile (file,error) {
        let fileContent = '';
        try{
            fileContent = fs.readFileSync(file,'utf8');
        }catch(e) {
            error && error({err:'文件读取出错',file:file})
        }
        return fileContent;
    }
}