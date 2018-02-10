# wepy-plugin-requireall

小程序WePY框架去中心化模块加载插件，主要用于配置中心，路由配置等。如配置中心，通过该插件可以分拆成多个模块，便于管理和维护。在大型项目中非常实用，不用手动引用子模块，总模块导出文件不会产生代码冲突。

## 一、效果

### 使用插件前：一个中心配置模块文件：config.js

如下代码，当配置非常多`config.js`容易引起冲突，管理和维护也非常困难。

    export default {
      testA: {
        "name": "testA"
      },
      testB: {
        "name": "testB"
      },
      testC: {
        "name": "testC"
      },
      testD: {
        "name": "testD"
      }
    }
    
### 使用插件后：

    ./config
    ├── index.js
    └── sub_modules
        ├── testA.js
        ├── testB.js
        ├── testC.js
        └── testD.js

大家可能说，这个手动拆成多个模块不就可以了。直接修改`config/index.js`手动`import`和`export`。这样话，当`sub_modules`每增加一个子模块，`index.js`都要手动引入，而且容易冲突。`wepy-plugin-requireall`引入后，只要`sub_modules`有新增子模块，自动修改`index.js`的包引用和导出。

## 二、使用方法

### 1.配置`wepy.config.js`文件添加`plugins`配置
    
      plugins: {
        'requireall': {
          filter: new RegExp('index\\.js$')
        }
      }

#### 可配参数：

    {
        src: 'src', //源文件目录
        dist: 'dist', //目标文件目录
        sourceMap: true, //是否开启sourceMap
        filter: new RegExp('\w$'), //文件过滤
        rule: RegExp('\\$BuildRequireAll\\(.+\\)') //匹配规则
    };
    
文件过滤建议严格一样，这样可以提高构建速度。如配置：`new RegExp('index\\.js$')`仅`index.js`的文件才需要使用本插件。

### 2. 项目总模块文件中添加方法调用

项目模块目录结构：

    ./config
    ├── index.js （在此文件添加$BuildRequireAll构建方法）
    └── sub_modules
        ├── testA.js
        ├── testB.js
        ├── testC.js
        └── testD.js

项目总模块文件为`config/index.js`，此文件只需要添加以下构建方法即可。为了防止开发工具报错，可以直接注释

    // $BuildRequireAll('./sub_modules', 'js')
    
支持两个参数：

- @param path 子模块路径，为降低设计的复杂度，只支持一级目录，不支持多级目录
- @param fileType [选填]文件类型后缀，子模块文件类型过滤

### 3. 子模块导出要求：

    export default {
      name: 'B'
    }

## 三、构建结果

    'use strict';
    
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.testD = exports.testC = exports.testB = exports.testA = undefined;
    
    var _testA = require('./sub_modules/testA.js');
    
    var _testA2 = _interopRequireDefault(_testA);
    
    var _testB = require('./sub_modules/testB.js');
    
    var _testB2 = _interopRequireDefault(_testB);
    
    var _testC = require('./sub_modules/testC.js');
    
    var _testC2 = _interopRequireDefault(_testC);
    
    var _testD = require('./sub_modules/testD.js');
    
    var _testD2 = _interopRequireDefault(_testD);
    
    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
    
    exports.testA = _testA2.default;
    exports.testB = _testB2.default;
    exports.testC = _testC2.default;
    exports.testD = _testD2.default;
