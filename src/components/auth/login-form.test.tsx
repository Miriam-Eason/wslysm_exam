import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginForm } from "./login-form";

// Before hydration (or with scripts disabled), credentials must never enter the URL.
for (const [role, homePath] of [["teacher", "/teacher"], ["student", "/student"], ["admin", "/admin"]] as const) {
  test(`${role} 登录表单的 HTML 使用 POST`, () => {
    const html = renderToStaticMarkup(createElement(LoginForm, {
      role, homePath, identifierLabel: "账号", identifierPlaceholder: "账号",
    }));
    assert.match(html, /<form\b[^>]*\bmethod="post"/i);
    assert.doesNotMatch(html, /<form\b[^>]*\bmethod="get"/i);
  });
}
