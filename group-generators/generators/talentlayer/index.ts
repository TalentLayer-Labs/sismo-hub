import { dataProviders } from "@group-generators/helpers/data-providers";
import { Tags, ValueType, GroupWithData } from "topics/group";
import {
  GenerationContext,
  GenerationFrequency,
  GroupGenerator,
} from "topics/group-generator";

const generateContributorsGroup = async (
  context: GenerationContext
): Promise<GroupWithData> => {
  const githubProvider = new dataProviders.GithubProvider();

  const githubProviderData0 = await githubProvider.getRepositoriesContributors({
    repositories: [
      "TalentLayer/talentlayer-id-contracts",
      "TalentLayer-Labs/indie-frontend",
      "TalentLayer/talentlayer-id-subgraph",
    ],
  });

  return {
    name: "talentlayer-contributors",
    timestamp: context.timestamp,
    description: "TalentLayer OpenSource Contributors",
    specs: "Help us building TalentLayer protocol ",
    data: githubProviderData0,
    valueType: ValueType.Score,
    tags: [Tags.Factory],
  };
};

const generateUsersGroup = async (
  context: GenerationContext
): Promise<GroupWithData> => {
  const talentLayerProvider = new dataProviders.TalentLayerProvider();

  const talentLayerProviderData0 =
    await talentLayerProvider.getUsersWithTalentLayerId();

  return {
    name: "talentlayer-users",
    timestamp: context.timestamp,
    description: "Be a user of talentLayer",
    specs: "Collect all users from decentralized subgraph of the protocol",
    data: talentLayerProviderData0,
    valueType: ValueType.Score,
    tags: [Tags.User],
  };
};

const generateDidSellerWorkForBuyerGroup = async (
  context: GenerationContext,
  buyer: string,
  seller: string
): Promise<GroupWithData> => {
  const talentLayerProvider = new dataProviders.TalentLayerProvider();

  const didWork = await talentLayerProvider.didSellerWorkForBuyer(
    buyer,
    seller
  );

  return {
    name: "talentlayer-did-work-for",
    timestamp: context.timestamp,
    description: "Find out if a user did work for a company",
    specs:
      "Check to see if a user did work for a company by checking the subgraph",
    data: didWork,
    valueType: ValueType.Score,
    tags: [Tags.User],
  };
};

const generateGetUserTotalSalaryGroup = async (
  context: GenerationContext,
  userAddress: string
): Promise<GroupWithData> => {
  const talentLayerProvider = new dataProviders.TalentLayerProvider();

  const didWork = await talentLayerProvider.getUserTotalSalary(userAddress);

  return {
    name: "talentlayer-did-work-for",
    timestamp: context.timestamp,
    description: "Find out if a user did work for a company",
    specs:
      "Check to see if a user did work for a company by checking the subgraph",
    data: didWork,
    valueType: ValueType.Score,
    tags: [Tags.User],
  };
};

const generator: GroupGenerator = {
  generationFrequency: GenerationFrequency.Weekly,

  generate: async (context: GenerationContext): Promise<GroupWithData[]> => {
    const contributorsGroup = await generateContributorsGroup(context);
    const usersGroup = await generateUsersGroup(context);
    const didWorkForGroup = await generateDidSellerWorkForBuyerGroup(
      context,
      "alice",
      "carol"
    );
    const getUserTotalSalaryGroup = await generateGetUserTotalSalaryGroup(
      context,
      "miguel"
    );

    return [
      contributorsGroup,
      usersGroup,
      didWorkForGroup,
      getUserTotalSalaryGroup,
    ];
  },
};

export default generator;
