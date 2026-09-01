import { Mission } from "./types";

export type CheckResult = { id: string; label: string; passed: boolean; help: string };

export function runExerciseChecks(mission: Mission, html: string, css: string, javascript: string): CheckResult[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const has = (selector: string) => Boolean(document.querySelector(selector));
  const text = document.body.textContent?.trim().length ?? 0;
  const results: Record<string, CheckResult[]> = {
    "wf-semantic-profile": [
      { id: "main", label: "Uses a main landmark", passed: has("main"), help: "Wrap the page content in a <main> element." },
      { id: "heading", label: "Has a page heading", passed: has("h1"), help: "Add one clear <h1> heading." },
      { id: "image", label: "Describes an image", passed: Array.from(document.images).some((image) => image.alt.trim().length > 0), help: "Add an image with useful alt text." },
    ],
    "wf-responsive-card": [
      { id: "content", label: "Contains card content", passed: text > 40, help: "Add a heading and a short description to your card." },
      { id: "layout", label: "Uses a responsive layout rule", passed: /(?:grid|flex)|@media/i.test(css), help: "Use Flexbox, Grid, or a media query in your CSS." },
      { id: "focus", label: "Includes a visible focus style", passed: /:focus(?:-visible)?/i.test(css), help: "Add a :focus-visible style for keyboard users." },
    ],
    "wf-accessible-form": [
      { id: "form", label: "Has a form and submit button", passed: has("form") && has("button[type='submit'], input[type='submit']"), help: "Add a <form> with a submit button." },
      { id: "labels", label: "Labels every field", passed: Array.from(document.querySelectorAll("input, textarea, select")).filter((field) => field.getAttribute("type") !== "submit").every((field) => Boolean(field.id && document.querySelector(`label[for='${CSS.escape(field.id)}']`))), help: "Give each field an id and connect a <label for=\"…\">." },
      { id: "feedback", label: "Provides status feedback", passed: has("[role='status'], [aria-live]"), help: "Add an aria-live status region for save feedback." },
    ],
    "wf-theme-toggle": [
      { id: "button", label: "Has a named toggle button", passed: has("button") && Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.trim()), help: "Add a button with clear text such as ‘Change theme’." },
      { id: "interaction", label: "Listens for a click", passed: /addEventListener\s*\(\s*["']click["']/.test(javascript), help: "Add a click event listener to your button." },
      { id: "state", label: "Changes a visual state", passed: /classList\.(?:toggle|add|remove)|dataset\./.test(javascript), help: "Toggle a class or data attribute when the button is clicked." },
    ],
    "wf-task-list": [
      { id: "input", label: "Has an input and add button", passed: has("input") && has("button"), help: "Add a text input and a button for new tasks." },
      { id: "list", label: "Has a task list", passed: has("ul, ol"), help: "Use a <ul> or <ol> for the tasks." },
      { id: "dom", label: "Creates an item in the DOM", passed: /createElement|insertAdjacentHTML|append(?:Child)?/.test(javascript), help: "Create and append a list item in JavaScript." },
    ],
    "wf-mini-project": [
      { id: "landmarks", label: "Uses meaningful page landmarks", passed: has("main") && has("header"), help: "Use at least <header> and <main> to structure the page." },
      { id: "form", label: "Includes an accessible form", passed: has("form") && Array.from(document.querySelectorAll("input, textarea, select")).every((field) => !field.id || Boolean(document.querySelector(`label[for='${CSS.escape(field.id)}']`))), help: "Include labeled form controls." },
      { id: "interaction", label: "Includes a JavaScript interaction", passed: /addEventListener/.test(javascript) && /(?:classList|createElement|textContent)/.test(javascript), help: "Add one useful interaction that updates the page." },
    ],
  };
  return results[mission.id] ?? [];
}
