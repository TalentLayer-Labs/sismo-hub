import { GroupGeneratorService } from "./group-generator";
import {
  GenerationContext,
  GenerationFrequency,
  GroupGenerator,
  GroupGeneratorsLibrary,
} from "./group-generator.types";
import {
  dependentGroup,
  dependentGroupTwo,
  groupGenerators,
  testGroup,
  groupToDelete,
  groupToDelete2,
  groupNotToDelete3,
  groupGeneratorsDeletion,
} from "./test-group-generator";
import { MemoryGroupGeneratorStore } from "infrastructure/group-generator-store";
import { MemoryGroupSnapshotStore } from "infrastructure/group-snapshot/group-snapshot-memory";
import { MemoryGroupStore } from "infrastructure/group-store";
import { MemoryLogger } from "infrastructure/logger/memory-logger";
import {
  AccountSource,
  GroupStore,
  GroupWithData,
  Tags,
  ValueType,
} from "topics/group";
import { GlobalResolver } from "topics/resolver/global-resolver";
import { testGlobalResolver } from "topics/resolver/test-resolvers";

export const testGroupWithUpperCase: GroupWithData = {
  name: "test-group",
  timestamp: 1,
  description: "test-description",
  specs: "test-specs",
  data: {
    "0x411C16b4688093C81db91e192aeB5945dCA6B785": 1,
    "0xFd247FF5380d7DA60E9018d1D29d529664839Af2": 3,
    "test:sismo": 15,
  },
  accountSources: [AccountSource.ETHEREUM, AccountSource.TEST],
  valueType: ValueType.Info,
  tags: [Tags.Vote, Tags.Mainnet],
};

export const testGroupWithWrongData: GroupWithData = {
  name: "test-group-with-wrong-data",
  timestamp: 1,
  description: "test-description",
  specs: "test-specs",
  data: {
    "0x411C16b4688093C81db91e192aeB5945dCA6B785": 1,
    "0xFd247FF5380d7DA60E9018d1D29d529664839Af2": 3,
    "test:sismo": 15,
    "fake:sismo": 9,
    "test:incorrect": 3,
  },
  accountSources: [AccountSource.ETHEREUM, AccountSource.TEST],
  valueType: ValueType.Info,
  tags: [Tags.Vote, Tags.Mainnet],
};

export const testGroupGeneratorWithUpperCase: GroupGenerator = {
  generationFrequency: GenerationFrequency.Once,

  generate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: GenerationContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groupStore: GroupStore
  ): Promise<GroupWithData[]> => [testGroupWithUpperCase],
};

export const testGroupGeneratorWithWrongData: GroupGenerator = {
  generationFrequency: GenerationFrequency.Once,

  generate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: GenerationContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groupStore: GroupStore
  ): Promise<GroupWithData[]> => [testGroupWithWrongData],
};

export const testGroupGeneratorWithWrongDescription: GroupGenerator = {
  generationFrequency: GenerationFrequency.Once,

  generate: async (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: GenerationContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    groupStore: GroupStore
  ): Promise<GroupWithData[]> => [
    { ...testGroupWithUpperCase, description: "" },
  ],
};

export const testGroupGenerators: GroupGeneratorsLibrary = {
  "test-generator-with-upper-case": testGroupGeneratorWithUpperCase,
  "test-generator-with-wrong-data": testGroupGeneratorWithWrongData,
  "test-generator-with-wrong-description":
    testGroupGeneratorWithWrongDescription,
};

describe("test group generator", () => {
  const groupStore = new MemoryGroupStore();
  const groupSnapshotStore = new MemoryGroupSnapshotStore();
  const groupGeneratorStore = new MemoryGroupGeneratorStore();
  const logger = new MemoryLogger();
  const service = new GroupGeneratorService({
    groupGenerators,
    groupStore,
    groupSnapshotStore,
    groupGeneratorStore,
    globalResolver: testGlobalResolver,
    logger,
  });

  beforeEach(async () => {
    await groupStore.reset();
    await groupGeneratorStore.reset();
  });

  it("Should throw an error if the global resolver is initialized with an unmap regex", () => {
    expect(() => {
      new GlobalResolver(["^test:", "^0x[a-fA-F0-9]{40}$", "^fakeRegex:"]);
    }).toThrow();
  });

  it("should generate context with timestamp in second", async () => {
    const context = await service.createContext({});
    expect(context.timestamp).toBeLessThan(10000000000000); // < year 2286
  });

  it("should generate context with fixed timestamp", async () => {
    const context = await service.createContext({
      timestamp: 1,
    });
    expect(context.timestamp).toEqual(1);
  });

  test("Should generate a group with the generator", async () => {
    await service.generateGroups("test-generator", {
      timestamp: 1,
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    expect(groups[testGroup.name]).toBeSameGroup(testGroup);
    const generatorGroups = await groupGeneratorStore.search({
      generatorName: "test-generator",
    });
    expect(generatorGroups).toHaveLength(1);
    expect(generatorGroups[0].timestamp).toEqual(1);
    expect(generatorGroups[0].name).toEqual("test-generator");
  });

  test("Should generate a group with only lower case addresses", async () => {
    const groupStore = new MemoryGroupStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const service = new GroupGeneratorService({
      groupGenerators: testGroupGenerators,
      groupGeneratorStore,
      groupSnapshotStore,
      groupStore,
      globalResolver: testGlobalResolver,
      logger,
    });
    await service.generateGroups("test-generator-with-upper-case", {
      timestamp: 1,
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    expect(
      Object.keys(
        await groups[testGroupWithUpperCase.name].resolvedIdentifierData()
      )
    ).toEqual([
      "0x411c16b4688093c81db91e192aeb5945dca6b785",
      "0xfd247ff5380d7da60e9018d1d29d529664839af2",
      "0x5151000000000000000000000000000000000001",
    ]);
  });

  it("Should throw an error if no regex matches", async () => {
    const groupStore = new MemoryGroupStore();
    const groupSnapshotStore = new MemoryGroupSnapshotStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const service = new GroupGeneratorService({
      groupGenerators: testGroupGenerators,
      groupGeneratorStore,
      groupSnapshotStore,
      groupStore,
      globalResolver: testGlobalResolver,
      logger,
    });
    await expect(async () => {
      await service.generateGroups("test-generator-with-wrong-data", {
        timestamp: 1,
      });
    }).rejects.toThrow();
  });

  it("Should create a valid group if the resolving errors are ignored", async () => {
    const testGlobalResolver = new GlobalResolver(
      ["^test:", "^0x[a-fA-F0-9]{40}$"],
      "true"
    );
    const groupStore = new MemoryGroupStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const service = new GroupGeneratorService({
      groupGenerators: testGroupGenerators,
      groupGeneratorStore,
      groupStore,
      groupSnapshotStore,
      globalResolver: testGlobalResolver,
      logger,
    });
    await service.generateGroups("test-generator-with-wrong-data", {
      timestamp: 1,
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    expect(
      Object.keys(await groups[testGroupWithWrongData.name].data())
    ).toEqual([
      "0x411c16b4688093c81db91e192aeb5945dca6b785",
      "0xfd247ff5380d7da60e9018d1d29d529664839af2",
      "test:sismo",
    ]);
    expect(
      Object.keys(
        await groups[testGroupWithWrongData.name].resolvedIdentifierData()
      )
    ).toEqual([
      "0x411c16b4688093c81db91e192aeb5945dca6b785",
      "0xfd247ff5380d7da60e9018d1d29d529664839af2",
      "0x5151000000000000000000000000000000000001",
    ]);
  });

  it("should throw error if generator name does not exist", async () => {
    await expect(async () => {
      await service.generateGroups("not-exists", {
        timestamp: 1,
      });
    }).rejects.toThrow();
  });

  it("should throw error if group description is empty", async () => {
    const testGlobalResolver = new GlobalResolver(
      ["^test:", "^0x[a-fA-F0-9]{40}$"],
      "true"
    );
    const groupStore = new MemoryGroupStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const service = new GroupGeneratorService({
      groupGenerators: testGroupGenerators,
      groupGeneratorStore,
      groupStore,
      groupSnapshotStore,
      globalResolver: testGlobalResolver,
      logger,
    });
    await expect(async () => {
      await service.generateGroups("test-generator-with-wrong-description", {
        timestamp: 10,
      });
    }).rejects.toThrow();
  });

  it("should generate all the groups", async () => {
    await service.generateAllGroups({
      timestamp: 1,
    });
    const allGroups = await groupStore.all();
    const groups = Object.values(allGroups);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toBeSameGroup(testGroup);
    expect(groups[1]).toBeSameGroup(dependentGroup);
    expect(groups[2]).toBeSameGroup(dependentGroupTwo);
  });

  it("should generate only once if the first generation only option is enabled", async () => {
    await service.generateGroups("test-generator", {
      timestamp: 1,
      firstGenerationOnly: true,
    });
    await service.generateGroups("test-generator", {
      timestamp: 2,
      firstGenerationOnly: true,
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    expect(groups[testGroup.name].name).toEqual("test-group");
    // only the first generate should have been triggered
    expect(groups[testGroup.name].timestamp).toEqual(1);
  });

  it("should generate only the groups with Once frequency", async () => {
    await service.generateAllGroups({
      frequency: "once",
      timestamp: 1,
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    expect(Object.values(groups)[0]).toBeSameGroup(testGroup);
  });

  it("should generate only the groups with Once frequency with additional data", async () => {
    await service.generateAllGroups({
      frequency: "once",
      timestamp: 1,
      additionalData: {
        "0x0000000000000000000000000000000000000030": 1,
        "0x0000000000000000000000000000000000000031": 2,
      },
    });
    const groups = await groupStore.all();
    expect(Object.keys(groups)).toHaveLength(1);
    const data = await Object.values(groups)[0].data();
    expect(data["0x0000000000000000000000000000000000000030"]).toBe("1");
    expect(data["0x0000000000000000000000000000000000000031"]).toBe("2");
  });

  it("should generate only two groups with frequency Daily and respect dependencies", async () => {
    await service.generateAllGroups({
      frequency: "daily",
      timestamp: 1,
    });
    const allGroups = await groupStore.all();
    const groups = Object.values(allGroups);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toBeSameGroup(dependentGroup);
    expect(groups[1]).toBeSameGroup(dependentGroupTwo);
  });

  test("Should generate a group with additional data", async () => {
    await service.generateGroups("test-generator", {
      timestamp: 1,
      additionalData: {
        "0x0000000000000000000000000000000000000030": 1,
        "0x0000000000000000000000000000000000000031": 2,
      },
    });
    const groups = await groupStore.all();
    const data = await groups[testGroup.name].data();
    expect(data["0x0000000000000000000000000000000000000030"]).toBe("1");
    expect(data["0x0000000000000000000000000000000000000031"]).toBe("2");
  });

  test("Should correctly parse additional data", async () => {
    expect(GroupGeneratorService.parseAdditionalData("")).toEqual({});
    expect(
      GroupGeneratorService.parseAdditionalData(
        "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01"
      )
    ).toEqual({
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01": 1,
    });
    expect(
      GroupGeneratorService.parseAdditionalData(
        "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01,"
      )
    ).toEqual({
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01": 1,
    });
    expect(
      GroupGeneratorService.parseAdditionalData(
        "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01,0xa1b073d5503a27DFBA337cFdb8458b71B3359c02"
      )
    ).toEqual({
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01": 1,
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c02": 1,
    });
    expect(
      GroupGeneratorService.parseAdditionalData(
        "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01,0xa1b073d5503a27DFBA337cFdb8458b71B3359c02=2"
      )
    ).toEqual({
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01": 1,
      "0xa1b073d5503a27DFBA337cFdb8458b71B3359c02": 2,
    });
    expect(() => GroupGeneratorService.parseAdditionalData("0x25=a")).toThrow();
    expect(() =>
      GroupGeneratorService.parseAdditionalData(
        "0xa1b073d5503a27DFBA337cFdb8458b71B3359c01=a"
      )
    ).toThrow();
  });

  test("should only update group metadata", async () => {
    const testGroupToUpdateMetadata: GroupWithData = {
      name: "test-group",
      timestamp: 1,
      description: "test-description",
      specs: "test-specs",
      data: {
        "0x411C16b4688093C81db91e192aeB5945dCA6B785": 1,
        "0xFd247FF5380d7DA60E9018d1D29d529664839Af2": 3,
        "test:sismo": 15,
      },
      accountSources: [AccountSource.ETHEREUM, AccountSource.TEST],
      valueType: ValueType.Info,
      tags: [Tags.Vote, Tags.Mainnet],
    };

    const updateGroupMetadataGroupGenerator: GroupGenerator = {
      generationFrequency: GenerationFrequency.Once,

      generate: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        context: GenerationContext,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        groupStore: GroupStore
      ): Promise<GroupWithData[]> => [testGroupToUpdateMetadata],
    };

    const updatedGenerators: GroupGeneratorsLibrary = {
      "update-group-metadata-group-generator":
        updateGroupMetadataGroupGenerator,
    };

    const groupStore = new MemoryGroupStore();
    const groupSnapshotStore = new MemoryGroupSnapshotStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const logger = new MemoryLogger();
    const service = new GroupGeneratorService({
      groupGenerators: updatedGenerators,
      groupStore,
      groupSnapshotStore,
      groupGeneratorStore,
      globalResolver: testGlobalResolver,
      logger,
    });

    await service.generateGroups("update-group-metadata-group-generator", {
      timestamp: 1,
    });
    const savedGroup = (await groupStore.all())[testGroupToUpdateMetadata.name];
    expect(savedGroup.name).toEqual("test-group");
    expect(savedGroup.description).toEqual("test-description");
    expect(savedGroup.specs).toEqual("test-specs");

    // we update the group metadata
    testGroupToUpdateMetadata.description =
      "Updated description for this group";
    testGroupToUpdateMetadata.specs = "Updated specs for this group";
    await service.updateGroupMetadata("update-group-metadata-group-generator");
    const updatedGroup = (await groupStore.all())[
      testGroupToUpdateMetadata.name
    ];

    expect(updatedGroup.name).toEqual("test-group");
    expect(updatedGroup.id).toEqual(savedGroup.id);
    expect(savedGroup.timestamp).toEqual(updatedGroup.timestamp);
    expect(updatedGroup.description).toEqual(
      "Updated description for this group"
    );
    expect(updatedGroup.specs).toEqual("Updated specs for this group");
  });

  it("should throw if trying to update metadata with a group generator that does not exist", async () => {
    await expect(
      service.updateGroupMetadata("non-existing-group-generator")
    ).rejects.toThrow(
      'Error while generating groups for generator "non-existing-group-generator". Does this generator exist?'
    );
  });

  it("should throw when trying to update metadata with a group generator that did not generate any group", async () => {
    await expect(service.updateGroupMetadata("test-generator")).rejects.toThrow(
      'Error while retrieving group for generator "test-generator". Has the group "test-group" been generated?'
    );
  });

  it("should generate 3 groups and then delete only one of these", async () => {
    const groupStore = new MemoryGroupStore();
    const groupSnapshotStore = new MemoryGroupSnapshotStore();
    const groupGeneratorStore = new MemoryGroupGeneratorStore();
    const logger = new MemoryLogger();
    const service = new GroupGeneratorService({
      groupGenerators: groupGeneratorsDeletion,
      groupStore,
      groupSnapshotStore,
      groupGeneratorStore,
      globalResolver: testGlobalResolver,
      logger,
    });

    await service.generateGroups("delete-groups-group-generator", {
      timestamp: 1675700878,
    });

    await service.generateGroups("delete-groups-group-generator", {
      timestamp: 1678120078,
    });

    await service.generateGroups("delete-groups-group-generator", {
      timestamp: 1680539278,
    });

    const groups = await groupStore.all();
    const groupSnapshots = await groupSnapshotStore.all();

    // Check that the groups have been saved
    expect(Object.keys(groups).length).toEqual(3);

    const savedGroup = groups[groupToDelete.name];
    expect(savedGroup.name).toEqual(groupToDelete.name);
    expect(savedGroup.description).toEqual(groupToDelete.description);
    expect(savedGroup.specs).toEqual(groupToDelete.specs);

    const savedGroup2 = groups[groupToDelete2.name];
    expect(savedGroup2.name).toEqual(groupToDelete2.name);
    expect(savedGroup2.description).toEqual(groupToDelete2.description);
    expect(savedGroup2.specs).toEqual(groupToDelete2.specs);

    const savedGroup3 = groups[groupNotToDelete3.name];
    expect(savedGroup3.name).toEqual(groupNotToDelete3.name);
    expect(savedGroup3.description).toEqual(groupNotToDelete3.description);
    expect(savedGroup3.specs).toEqual(groupNotToDelete3.specs);

    // Check that the group snapshots have been saved
    expect(groupSnapshots.length).toEqual(9);

    expect(groupSnapshots[0].timestamp).toEqual(1675700878);
    expect(groupSnapshots[0].name).toEqual(groupToDelete.name);

    expect(groupSnapshots[1].timestamp).toEqual(1675700878);
    expect(groupSnapshots[1].name).toEqual(groupToDelete2.name);

    expect(groupSnapshots[2].timestamp).toEqual(1675700878);
    expect(groupSnapshots[2].name).toEqual(groupNotToDelete3.name);

    expect(groupSnapshots[3].timestamp).toEqual(1678120078);
    expect(groupSnapshots[3].name).toEqual(groupToDelete.name);

    expect(groupSnapshots[4].timestamp).toEqual(1678120078);
    expect(groupSnapshots[4].name).toEqual(groupToDelete2.name);

    expect(groupSnapshots[5].timestamp).toEqual(1678120078);
    expect(groupSnapshots[5].name).toEqual(groupNotToDelete3.name);

    expect(groupSnapshots[6].timestamp).toEqual(1680539278);
    expect(groupSnapshots[6].name).toEqual(groupToDelete.name);

    expect(groupSnapshots[7].timestamp).toEqual(1680539278);
    expect(groupSnapshots[7].name).toEqual(groupToDelete2.name);

    expect(groupSnapshots[8].timestamp).toEqual(1680539278);
    expect(groupSnapshots[8].name).toEqual(groupNotToDelete3.name);

    // Delete the groups
    expect(await service.deleteGroups("test-group,test-group-2"));

    // Check that the groups has been deleted
    const groupsAfter = await groupStore.all();
    expect(Object.keys(groupsAfter).length).toEqual(
      Object.keys(groups).length - 2
    );

    expect(await groupStore.search({ groupName: savedGroup.name })).toEqual([]);
    expect(await groupSnapshotStore.allByGroupId(savedGroup.id)).toEqual([]);

    expect(await groupStore.search({ groupName: savedGroup2.name })).toEqual(
      []
    );
    expect(await groupSnapshotStore.allByGroupId(savedGroup2.id)).toEqual([]);

    // Check that the other group have not been deleted
    const savedGroup3After = await groupStore.search({
      groupName: savedGroup3.name,
    });
    expect(savedGroup3After[0].name).toEqual(groupNotToDelete3.name);
    expect(savedGroup3After[0].description).toEqual(
      groupNotToDelete3.description
    );
    expect(savedGroup3After[0].specs).toEqual(groupNotToDelete3.specs);
    const savedGroupSnapshot3After = await groupSnapshotStore.allByGroupId(
      savedGroup3After[0].id
    );
    expect(savedGroupSnapshot3After[0].name).toEqual(groupNotToDelete3.name);

    // Check that the group snapshots have been deleted
    const groupSnapshotsAfter = await groupSnapshotStore.all();
    expect(Object.keys(groupSnapshotsAfter).length).toEqual(
      Object.keys(groupSnapshots).length - 6
    );

    // Check that the others group snapshots haven't been deleted
    expect(groupSnapshotsAfter[0].timestamp).toEqual(1675700878);
    expect(groupSnapshotsAfter[0].name).toEqual(groupNotToDelete3.name);

    expect(groupSnapshotsAfter[1].timestamp).toEqual(1678120078);
    expect(groupSnapshotsAfter[1].name).toEqual(groupNotToDelete3.name);

    expect(groupSnapshotsAfter[2].timestamp).toEqual(1680539278);
    expect(groupSnapshotsAfter[2].name).toEqual(groupNotToDelete3.name);
  });

  it("should throw when trying to delete group doesn't exist", async () => {
    await expect(service.deleteGroups("test-generator")).rejects.toThrow(
      'Error while retrieving group for group "test-generator". Has a group already been created?'
    );
  });
});
