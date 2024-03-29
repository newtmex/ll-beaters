import AddStake from "./_components/AddStake";
import MintFamily from "./_components/MintFamily";
import type { NextPage } from "next";
import { RefLink } from "~~/components/RefLink/RefLink";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">Welcome to</span>
            <span className="block text-4xl font-bold">LL_Beaters</span>
          </h1>
          <RefLink />
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <AddStake />
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MintFamily />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
