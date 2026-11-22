import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isJsxText,
  isNoSubstitutionTemplateLiteral,
  isStringLiteral,
  isTemplateHead,
  isTemplateMiddle,
  isTemplateTail,
  type Node,
  type SourceFile,
} from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

// User-facing text comes from the catalog and nowhere else (ADR 0007). The
// check walks the TypeScript AST of `client/**` and `server/**`, so comments —
// deliberately Russian — are never inspected: only string literals, template
// literals and JSX text are. A hidden Cyrillic phrase in a component or a
// service therefore breaks the build instead of relying on review.
//
// `errors.api` completeness is not checked here on purpose: the contract model
// (`packages/api/spec/i18n.tsp`) types the catalog by `ErrorCode`, so the
// compiler already demands a message for every code. Do not add a duplicate
// test for it.
const CYRILLIC = /[\u0400-\u04FF]/;

// The documented exceptions to «every user-facing string comes from the
// catalog»: the catalog itself, and the provider's bootstrap screen, which is
// the only place allowed to show text before `GET /api/v1/messages` answers.
const ALLOWED = ['server/shared/i18n/', 'client/lib/i18n.tsx'];

const HINT =
  'Пользовательский текст живёт в каталоге: добавьте ключ в server/shared/i18n/ru.ts ' +
  'и возьмите его через t() (ADR 0007).';

type Violation = {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly text: string;
};

function isAllowed(file: string): boolean {
  return ALLOWED.some((allowed) =>
    allowed.endsWith('/') ? file.startsWith(allowed) : file === allowed,
  );
}

function isUserFacingText(node: Node): node is Node & { readonly text: string } {
  return (
    isStringLiteral(node) ||
    isNoSubstitutionTemplateLiteral(node) ||
    isTemplateHead(node) ||
    isTemplateMiddle(node) ||
    isTemplateTail(node) ||
    isJsxText(node)
  );
}

function violationsOf(sourceFile: SourceFile): Violation[] {
  const violations: Violation[] = [];
  const visit = (node: Node): void => {
    if (isUserFacingText(node) && CYRILLIC.test(node.text)) {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      );
      violations.push({
        file: relative(process.cwd(), sourceFile.fileName),
        line: line + 1,
        column: character + 1,
        text: node.text.trim(),
      });
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);
  return violations;
}

function explain(violations: readonly Violation[]): string {
  const places = violations.map(
    ({ file, line, column, text }) => `  ${file}:${line}:${column} — «${text}»`,
  );
  return [`Найдена кириллица вне каталога текстов (${violations.length}):`, ...places, HINT].join(
    '\n',
  );
}

describe('гардрейл каталога текстов', () => {
  it('кириллица вне server/shared/i18n ломает сборку', () => {
    const api = new API();
    try {
      const snapshot = api.updateSnapshot({ openProjects: ['tsconfig.json'] });
      const project = snapshot
        .getProjects()
        .find((candidate) => candidate.configFileName.endsWith('tsconfig.json'));
      if (!project) {
        throw new Error('tsconfig.json не найден в проекте — нечего проверять');
      }

      const sources = project.program
        .getSourceFileNames()
        .map((name) => relative(process.cwd(), name))
        .filter((file) => file.startsWith('client/') || file.startsWith('server/'))
        .filter((file) => !isAllowed(file));

      // A silently empty walk would make the guard pass for the wrong reason.
      expect(sources.length).toBeGreaterThan(0);

      const violations = sources.flatMap((file) => {
        const sourceFile = project.program.getSourceFile(file);
        return sourceFile ? violationsOf(sourceFile) : [];
      });

      expect(violations, explain(violations)).toEqual([]);
    } finally {
      api.close();
    }
  });
});
