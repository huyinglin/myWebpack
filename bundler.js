const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

const moduleAnalyser = (filename) => {
  const content = fs.readFileSync(filename, 'utf-8');
  const ast = (parser.parse(content, {
    sourceType: 'module',
  }));
  const dependencies = {};
  // 分析AST
  traverse(ast, {
    ImportDeclaration({ node }) {
      // 找到import代码
      const dirname = path.dirname(filename);
      const newFile = './' + path.join(dirname, node.source.value); // 合并相对路径
      dependencies[node.source.value] = newFile;
    }
  });

  // 将AST转换成浏览器可以识别的代码
  const { code } = babel.transformFromAst(ast, null, {
    presets: ['@babel/preset-env'],
  });
  return {
    filename,
    dependencies,
    code,
  };
}

// 依赖分析图
const makeDependenciesGraph = (entry) => {
  const entryModule = moduleAnalyser(entry);
  const graphArray = [entryModule];
  for (let i = 0; i < graphArray.length; i++) {
    const { dependencies } = graphArray[i];
    if (dependencies) {
      for (let j in dependencies) {
        graphArray.push(moduleAnalyser(dependencies[j]));
      }
    }
  }
  const graph = {};
  graphArray.forEach(item => {
    // 转成对象
    graph[item.filename] = {
      dependencies: item.dependencies,
      code: item.code,
    };
  });
  return graph;
}

// 生成代码
const generateCode = (entry) => {
  const graph = JSON.stringify(makeDependenciesGraph(entry));
  return `
    (function(graph) {
      function require(module) {
        function localRequire(relativePath) {
          return require(graph[module].dependencies[relativePath]);
        }
        var exports = {};
        (function(require, exports, code) {
          eval(code);
        })(localRequire, exports, graph[module].code)
        return exports;
      }
      require('${entry}');
    })(${graph})
  `;
}

const code = generateCode('./src/index.js');
console.log('code: ', code);
