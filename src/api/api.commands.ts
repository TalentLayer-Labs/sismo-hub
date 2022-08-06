import { Option } from "commander";
import { FastifyInstance } from "fastify";
import { createFastify } from "./api";
import { DataSourcesCmd, GlobalOptions } from "cli/command";

type ApiOptions = GlobalOptions & {
  port: number;
};

export const getFastify = ({
  groupStore,
  groupGeneratorLibrary,
}: ApiOptions): FastifyInstance => {
  return createFastify({
    log: true,
    groupStore: groupStore,
    groupGeneratorLibrary: groupGeneratorLibrary,
  });
};

/* istanbul ignore next */
export const startApi = async (options: ApiOptions): Promise<void> => {
  await getFastify(options).listen({ port: options.port });
};

export const apiCmd = new DataSourcesCmd("api");
apiCmd.addOption(
  new Option("--port <number>", "Listen to specific port")
    .default(8000)
    .argParser(parseInt)
);
apiCmd.action(startApi);