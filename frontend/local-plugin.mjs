const OPEN_OBJECT_NAMES = new Set(['window', 'globalThis', 'self']);

const isWindowOpenCall = (callee) => {
  if (!callee || callee.type !== 'MemberExpression') return false;
  if (callee.optional) return false;

  const objectNode = callee.object;
  const propertyNode = callee.property;
  const objectName = objectNode?.type === 'Identifier' ? objectNode.name : '';

  if (!OPEN_OBJECT_NAMES.has(objectName)) return false;

  if (!callee.computed && propertyNode?.type === 'Identifier') {
    return propertyNode.name === 'open';
  }

  return callee.computed && propertyNode?.type === 'Literal' && propertyNode.value === 'open';
};

const getStaticStringValue = (node) => {
  if (!node) return null;

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? '';
  }

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = getStaticStringValue(node.left);
    const right = getStaticStringValue(node.right);
    if (left == null || right == null) return null;
    return left + right;
  }

  return null;
};

const hasToken = (value, expectedToken) =>
  String(value || '')
    .split(/[,\s]+/)
    .some((token) => token.trim().toLowerCase() === expectedToken);

const hasNoopenerToken = (value) => hasToken(value, 'noopener');
const hasNoreferrerToken = (value) => hasToken(value, 'noreferrer');

const getStaticJsxAttributeValue = (attribute) => {
  const valueNode = attribute?.value;
  if (!valueNode) return '';

  if (valueNode.type === 'Literal' && typeof valueNode.value === 'string') {
    return valueNode.value;
  }

  if (valueNode.type === 'JSXExpressionContainer') {
    return getStaticStringValue(valueNode.expression);
  }

  return null;
};

/** @type {import('eslint').Rule.RuleModule} */
const requireWindowOpenNoopenerRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require window.open() to include noopener or clear opener on the opened window',
    },
    schema: [],
    messages: {
      missingProtection: 'window.open() must include "noopener" or explicitly set the opened window\'s opener to null.',
      nonStaticFeatures: 'window.open() must use a static features string containing "noopener", or explicitly set opener to null.',
      missingNoopener: 'window.open() features must include "noopener".',
    },
  },
  create(context) {
    const getAssignedIdentifierName = (node) => {
      if (node.parent?.type === 'VariableDeclarator' && node.parent.init === node && node.parent.id?.type === 'Identifier') {
        return node.parent.id.name;
      }

      if (node.parent?.type === 'AssignmentExpression' && node.parent.right === node && node.parent.left?.type === 'Identifier') {
        return node.parent.left.name;
      }

      return '';
    };

    const isOpenerNullAssignment = (node, identifierName) =>
      node?.type === 'AssignmentExpression' &&
      node.operator === '=' &&
      node.left?.type === 'MemberExpression' &&
      !node.left.computed &&
      node.left.object?.type === 'Identifier' &&
      node.left.object.name === identifierName &&
      node.left.property?.type === 'Identifier' &&
      node.left.property.name === 'opener' &&
      node.right?.type === 'Literal' &&
      node.right.value === null;

    const statementContainsOpenerNullAssignment = (node, identifierName, visited = new WeakSet()) => {
      if (!node || !identifierName) return false;
      if (typeof node !== 'object') return false;
      if (visited.has(node)) return false;
      visited.add(node);

      if (isOpenerNullAssignment(node, identifierName)) return true;

      for (const [key, value] of Object.entries(node)) {
        if (key === 'parent') continue;
        if (!value) continue;
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child === 'object' && statementContainsOpenerNullAssignment(child, identifierName, visited)) {
              return true;
            }
          }
          continue;
        }

        if (typeof value === 'object' && statementContainsOpenerNullAssignment(value, identifierName, visited)) {
          return true;
        }
      }

      return false;
    };

    const hasOpenerNullFallback = (node) => {
      const identifierName = getAssignedIdentifierName(node);
      if (!identifierName) return false;

      let statementNode = node;
      while (statementNode && !/Statement$/.test(statementNode.type) && statementNode.type !== 'VariableDeclaration') {
        statementNode = statementNode.parent;
      }

      const blockNode = statementNode?.parent;
      if (!statementNode || blockNode?.type !== 'BlockStatement' || !Array.isArray(blockNode.body)) {
        return false;
      }

      const statementIndex = blockNode.body.indexOf(statementNode);
      if (statementIndex < 0) return false;

      return blockNode.body.slice(statementIndex + 1).some((sibling) => statementContainsOpenerNullAssignment(sibling, identifierName));
    };

    return {
      CallExpression(node) {
        if (!isWindowOpenCall(node.callee)) return;

        const featuresArg = node.arguments[2];
        if (!featuresArg) {
          if (!hasOpenerNullFallback(node)) {
            context.report({ node, messageId: 'missingProtection' });
          }
          return;
        }

        const featuresValue = getStaticStringValue(featuresArg);
        if (featuresValue == null) {
          if (!hasOpenerNullFallback(node)) {
            context.report({ node: featuresArg, messageId: 'nonStaticFeatures' });
          }
          return;
        }

        if (!hasNoopenerToken(featuresValue)) {
          if (!hasOpenerNullFallback(node)) {
            context.report({ node: featuresArg, messageId: 'missingNoopener' });
          }
        }
      },
    };
  },
};

/** @type {import('eslint').Rule.RuleModule} */
const requireBlankTargetRelRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require rel="noopener noreferrer" on JSX elements with target="_blank"',
    },
    schema: [],
    messages: {
      missingRel: 'Elements with target="_blank" must include a rel attribute containing both "noopener" and "noreferrer".',
      nonStaticRel: 'Elements with target="_blank" must use a static rel string containing both "noopener" and "noreferrer".',
      missingNoopener: 'rel for target="_blank" must include "noopener".',
      missingNoreferrer: 'rel for target="_blank" must include "noreferrer".',
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const attributes = node.attributes.filter((attribute) => attribute?.type === 'JSXAttribute');
        const targetAttribute = attributes.find((attribute) => attribute.name?.name === 'target');
        if (!targetAttribute) return;

        const targetValue = getStaticJsxAttributeValue(targetAttribute);
        if (targetValue !== '_blank') return;

        const relAttribute = attributes.find((attribute) => attribute.name?.name === 'rel');
        if (!relAttribute) {
          context.report({ node, messageId: 'missingRel' });
          return;
        }

        const relValue = getStaticJsxAttributeValue(relAttribute);
        if (relValue == null) {
          context.report({ node: relAttribute, messageId: 'nonStaticRel' });
          return;
        }

        if (!hasNoopenerToken(relValue)) {
          context.report({ node: relAttribute, messageId: 'missingNoopener' });
        }

        if (!hasNoreferrerToken(relValue)) {
          context.report({ node: relAttribute, messageId: 'missingNoreferrer' });
        }
      },
    };
  },
};

/** @type {import('eslint').ESLint.Plugin} */
const localPlugin = {
  rules: {
    'require-window-open-noopener': requireWindowOpenNoopenerRule,
    'require-blank-target-rel': requireBlankTargetRelRule,
  },
};

export default localPlugin;
