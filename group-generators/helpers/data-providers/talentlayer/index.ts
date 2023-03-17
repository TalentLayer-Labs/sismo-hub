import {
  getTalentLayerUsersCountQuery,
  getServicesByBuyerQuery,
  getUsersWithTalentLayerIdQuery,
  getServicesByTopicQuery,
  getUserTotalSalaryQuery,
} from "./queries";
import { ServicesType, UsersType } from "./types";
import { GraphQLProvider } from "@group-generators/helpers/data-providers/graphql";
import { FetchedData } from "topics/group";

export class TalentLayerProvider extends GraphQLProvider {
  constructor() {
    super({
      url: "https://api.thegraph.com/subgraphs/name/talentlayer/talent-layer-mumbai",
    });
  }

  public async getUsersWithTalentLayerId(): Promise<FetchedData> {
    const dataProfiles: FetchedData = {};
    const response: UsersType = await getUsersWithTalentLayerIdQuery(this);
    response.users.forEach((user) => {
      dataProfiles[user.address] = 1;
    });
    return dataProfiles;
  }

  public async getTalentLayerUsersCount(): Promise<number> {
    const response = await getTalentLayerUsersCountQuery(this);
    return response.users.length;
  }

  public async didSellerServiceBuyerQuery(
    buyer: string,
    numberOfTimes: number
  ): Promise<FetchedData> {
    const dataProfiles: FetchedData = {};
    const response: ServicesType = await getServicesByBuyerQuery(this, buyer);
    if (response.services.length >= numberOfTimes) {
      dataProfiles[response.services[0].seller.address] = 1;
    }
    return dataProfiles;
  }

  public async didWorkOnTopic(
    topic: string,
    numberOfTimes: number
  ): Promise<FetchedData> {
    const dataProfiles: FetchedData = {};
    const response: ServicesType = await getServicesByTopicQuery(this, topic);
    const countByUser: { [address: string]: number } = {};

    response.services.forEach((service) => {
      countByUser[service.seller.address] =
        countByUser[service.seller.address] || 0 + 1;
    });

    Object.keys(countByUser).forEach((address) => {
      if (countByUser[address] >= numberOfTimes) {
        dataProfiles[address] = 1;
      }
    });
    return dataProfiles;
  }

  public async getUserTotalSalary(userAddress: string): Promise<FetchedData> {
    const userGains: FetchedData = {};
    const response: UsersType = await getUserTotalSalaryQuery(
      this,
      userAddress
    );
    response.users.forEach((user) => {
      userGains[user.address] = user.gains?.totalGain || 0;
    });
    return userGains;
  }
}
