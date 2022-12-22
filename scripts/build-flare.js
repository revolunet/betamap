// compile JSON from beta.gouv API
const build = async () => {
  const startups = await await fetch(
    "https://beta.gouv.fr/api/v2.5/startups.json"
  ).then((r) => r.json());
  const authors = await await fetch(
    "https://beta.gouv.fr/api/v2.5/authors.json"
  ).then((r) => r.json());
  const incubators = await await fetch(
    "https://beta.gouv.fr/api/v2.5/incubators.json"
  ).then((r) => r.json());

  return {
    name: "flare",
    children: Object.keys(incubators).map((incubator) => {
      const name = incubators[incubator].title;
      return {
        name,
        children: startups.data
          .filter(
            (startup) => startup.relationships.incubator.data.id === incubator
          )
          .map((startup) => {
            const sortedPhases =
              startup.attributes.phases &&
              startup.attributes.phases
                .filter((phase) => !!phase.start)
                .sort((a, b) => new Date(a.start) - new Date(b.start));

            const latestPhase =
              sortedPhases &&
              sortedPhases.length &&
              sortedPhases[sortedPhases.length - 1];

            const members = authors.filter(
              (author) =>
                author.startups && author.startups.includes(startup.id)
            ).length;
            return {
              id: startup.id,
              name: startup.attributes.name,
              pitch: startup.attributes.pitch,
              repository: startup.attributes.repository,
              link: startup.attributes.link,
              phase: latestPhase.name,
              phaseStart: latestPhase.start,
              value: members + 1,
            };
          }),
      };
    }),
  };
};

build().then((flare) => console.log(JSON.stringify(flare, null, 2)));
