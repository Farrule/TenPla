import { Project, VariableDeclaration } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles("src/**/*.{ts,tsx}");

for (const sourceFile of sourceFiles) {
  let modified = false;

  // 1. function 宣言の関数
  for (const fn of sourceFile.getFunctions()) {
    if (fn.getJsDocs().length === 0) {
      const params = fn.getParameters().map((p) => `@param ${p.getName()} - `);
      const returnType = fn.getReturnType().getText();
      const docs = [
        `${fn.getName() ?? "関数"}の概要`,
        "",
        ...params,
        returnType !== "void" ? `@returns ` : "",
      ].filter(Boolean);

      fn.addJsDoc({ description: docs.join("\n ") });
      modified = true;
    }
  }

  // 2. const で定義されたアロー関数コンポーネント / 関数
  for (const statement of sourceFile.getVariableStatements()) {
    if (statement.getJsDocs().length === 0) {
      const decl = statement.getDeclarations()[0];
      const initializer = decl?.getInitializer();
      // アロー関数または関数式の場合
      if (
        initializer &&
        (initializer.getKindName() === "ArrowFunction" ||
          initializer.getKindName() === "FunctionExpression")
      ) {
        statement.addJsDoc({ description: `${decl.getName()} の概要` });
        modified = true;
      }
    }
  }

  // 3. インターフェース (Propsなど)
  for (const iface of sourceFile.getInterfaces()) {
    if (iface.getJsDocs().length === 0) {
      iface.addJsDoc({ description: `${iface.getName()} のプロパティ定義` });
      modified = true;
    }
  }

  // 4. 型エイリアス (type)
  for (const typeAlias of sourceFile.getTypeAliases()) {
    if (typeAlias.getJsDocs().length === 0) {
      typeAlias.addJsDoc({ description: `${typeAlias.getName()} の型定義` });
      modified = true;
    }
  }

  if (modified) {
    sourceFile.saveSync();
    console.log(`Updated JSDoc: ${sourceFile.getBaseName()}`);
  }
}
console.log("JSDoc template generation completed!");
