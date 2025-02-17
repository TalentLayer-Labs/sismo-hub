
import { dataProviders } from "@group-generators/helpers/data-providers";
import { ValueType, GroupWithData } from "topics/group";
import {
  GenerationContext,
  GenerationFrequency,
  GroupGenerator,
} from "topics/group-generator";

// Generated from factory.sismo.io

const generator: GroupGenerator = {
  
  generationFrequency: GenerationFrequency.Once,
  
  generate: async (context: GenerationContext): Promise<GroupWithData[]> => {
  
    const gitHubProvider = new dataProviders.GithubProvider();
    
    const contributors = await gitHubProvider.getRepositoriesContributors({
      repositories: ["sismo-core/sismo-hub", "sismo-core/sismo-docs"],
    });

    return [
      {
        name: "sismo-github-contributors",
        timestamp: context.timestamp,
        description: "Sismo Github Contributors",
        specs: "",
        data: contributors,
        valueType: ValueType.Score,
        tags: [],
      },
    ];
  },
};

export default generator;
