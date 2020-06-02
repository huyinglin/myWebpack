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
  console.log('code: ', code);
  return {
    filename,
    dependencies,
    code,
  };
}

const moduleInfo = moduleAnalyser('./src/index.js');
