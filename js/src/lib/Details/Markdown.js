import React from 'react';
import marked from 'marked';
import xss from 'xss';
import hljs from '../../../../js/src/lib/highlight.pack';

import { prefixURL } from '../util';

const GITHUB = {
  main: 'https://github.com',
  raw: 'https://raw.githubusercontent.com',
};

marked.Lexer.rules.gfm.heading = marked.Lexer.rules.normal.heading;
marked.Lexer.rules.tables.heading = marked.Lexer.rules.normal.heading;

const renderAndEscapeMarkdown = ({ source, githubRepo }) => {
  const renderer = new marked.Renderer();

  if (githubRepo) {
    const { user, project, path, head } = githubRepo;
    const prefixImage = href =>
      prefixURL(href, {
        base: GITHUB.raw,
        user,
        project,
        head: head || 'master',
        path,
      });
    const prefixLink = href =>
      prefixURL(href, {
        base: GITHUB.main,
        user,
        project,
        head: `blob/${head || 'master'}`,
        path: `${path}`,
      });

    // manually ask for sanitation of svgs, otherwise it will have wrong content-type
    function sanitize(href) {
      if (
        href.indexOf('//') === -1 &&
        String.prototype.endsWith &&
        href.endsWith('.svg')
      ) {
        return `${href}?sanitize=true`;
      }
      return href;
    }

    renderer.image = (href, title, text) =>
      `<img src="${prefixImage(
        sanitize(href)
      )}" title="${title}" alt="${text}"/>`;

    renderer.link = (href, title, text) => {
      // wrongly linked comments
      // see https://github.com/yarnpkg/website/issues/685
      if (text.startsWith('!--')) {
        return '';
      }
      return `<a href="${prefixLink(href)}" title="${title}">${text}</a>`;
    };

    renderer.html = function(html) {
      return html.replace(
        /(src|href)="([^"]*)/g,
        (match, type, href) =>
          `${type}="${type === 'href' ? prefixLink(href) : prefixImage(href)}`
      );
    };
  }

  renderer.code = function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const prepared = hljs.highlight(lang, code);
        return `<pre><code class="${prepared.language}">${prepared.value}</code></pre>`;
      } catch (err) {}
    }

    try {
      const prepared = hljs.highlightAuto(code);
      return `<pre><code class="${prepared.language}">${prepared.value}</code></pre>`;
    } catch (err) {}

    return `<pre><code>${code}</code></pre>`;
  };

  return xss(marked(source, { renderer, mangle: false }), {
    whiteList: {
      ...xss.getDefaultWhiteList(),
      code: ['class'],
      span: ['class'],
    },
  });
};

const Markdown = ({ source, githubRepo }) => (
  <article
    dangerouslySetInnerHTML={{
      __html: renderAndEscapeMarkdown({
        source,
        githubRepo,
      }),
    }}
  />
);

export default Markdown;
