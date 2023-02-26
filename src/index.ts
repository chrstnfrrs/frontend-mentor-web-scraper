import fs from 'fs';
import playwright from 'playwright';
import { ofetch } from 'ofetch';
import * as dotenv from 'dotenv';
dotenv.config();

type RepositoryTopic = {
  topic: { name: string };
};

type GithubRepo = {
  name: string;
  repositoryTopics: {
    nodes: RepositoryTopic[];
  };
};

const GITHUB_QUERY = `query {
  user(login: "chrstnfrrs") {
      repositories (first: 100) {
          nodes {
              id
              name
              homepageUrl
              url
              description
              repositoryTopics (first: 100) {
                  nodes {
                      topic {
                          name
                      }
                  }
              }
          }
      }
  }
}`;

console.log('------------------------------------');
console.log('Fetching repository list from Github');
console.log('------------------------------------\n\n');

const { data: repos } = await ofetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_ACCESS_TOKEN}`,
  },
  body: {
    query: GITHUB_QUERY,
  },
});

const projects: GithubRepo[] = repos.user.repositories.nodes.filter(
  (repo: GithubRepo) =>
    repo.repositoryTopics.nodes.some(
      (repoTopic: RepositoryTopic) => repoTopic.topic.name === 'frontend-mentor'
    )
);

console.log('-----------------------------------------');
console.log('Scraping the frontend mentor project list');
console.log('-----------------------------------------\n\n');

const browser = await playwright.chromium.launch({
  headless: false, // setting this to true will not run the UI
});

const page = await browser.newPage();
await page.goto('https://www.frontendmentor.io/challenges');

const listItems = await page.getByRole('listitem').all();

const data = [['Name', 'Difficulty', 'Skills', 'Completed']];

for (const li of listItems) {
  const heading = await li.getByRole('heading');
  const link = await heading.getByRole('link');
  const name = (await link.allInnerTexts())[0];

  if (name) {
    const skillsEls = await li.getByRole('listitem').all();
    const skills = [];
    for (const skill of skillsEls) {
      skills.push((await skill.allInnerTexts())[0]);
    }

    let difficulty = '';
    for (const level of [
      'NEWBIE',
      'JUNIOR',
      'INTERMEDIATE',
      'ADVANCED',
      'GURU',
    ]) {
      const texts = await li.getByText(level).allInnerTexts();
      if (texts.some((text) => text === level)) {
        difficulty = level;
        break;
      }
    }

    data.push([
      name.replace(/,/g, ''),
      difficulty,
      skills.join(' '),
      projects.some((project) =>
        project.name
          .replace(/-/g, ' ')
          .toLocaleLowerCase()
          .includes(
            name.replace(/,/g, '').replace(/-/g, ' ').toLocaleLowerCase()
          )
      )
        ? 'Yes'
        : 'No',
    ]);
  }
}

await browser.close();

const csv = data.map((row) => row.join(', ')).join('\n');

fs.writeFile('frontend-mentor-projects.csv', csv, 'utf8', function (err) {
  if (err) {
    console.log(
      'Some error occured - file either not saved or corrupted file saved.'
    );
  } else {
    console.log('------------------------------------');
    console.log('frontend-mentor-projects.csv saved!');
    console.log('------------------------------------\n\n');

    console.log('------------------------------------');
    console.log(
      `You have completed ${
        data.filter((project) => project[3] === 'Yes').length
      } / ${data.length - 1} projects!`
    );
    console.log('------------------------------------');
  }
});
