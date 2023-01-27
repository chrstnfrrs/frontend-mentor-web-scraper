import fs from "fs";
import playwright from "playwright";

const browser = await playwright.chromium.launch({
  headless: false, // setting this to true will not run the UI
});

const page = await browser.newPage();
await page.goto("https://www.frontendmentor.io/challenges");

const listItems = await page.getByRole("listitem").all();

const data = [];

for (const li of listItems) {
  const heading = await li.getByRole("heading");
  const link = await heading.getByRole("link");
  const text = await link.allInnerTexts();
  if (text.length) {
    const skillsEls = await li.getByRole("listitem").all();
    const skills = [];
    for (const skill of skillsEls) {
      skills.push((await skill.allInnerTexts())[0]);
    }

    let difficulty = "";
    for (const level of [
      "NEWBIE",
      "JUNIOR",
      "INTERMEDIATE",
      "ADVANCED",
      "GURU",
    ]) {
      const texts = await li.getByText(level).allInnerTexts();
      if (texts.some((text) => text === level)) {
        difficulty = level;
        break;
      }
    }

    data.push({ name: text[0], skills, difficulty });
  }
}

await browser.close();

const csvData = [["Name", "Difficulty", "Skills"]];
data.forEach((project) => {
  csvData.push([
    project.name.replace(/,/g, ""),
    project.difficulty,
    project.skills.join(" "),
  ]);
});
const csv = csvData.map((row) => row.join(", ")).join("\n");

fs.writeFile("frontend-mentor-projects.csv", csv, "utf8", function (err) {
  if (err) {
    console.log(
      "Some error occured - file either not saved or corrupted file saved."
    );
  } else {
    console.log("frontend-mentor-projects.csv saved!");
  }
});
