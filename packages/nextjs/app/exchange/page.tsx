import ExchangeNfts from "./_components/ExchangeNfts";
import { NextPage } from "next";

const Widthdraw: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">Exchange Families/Members</span>
            <span className="block text-4xl font-bold">LL_Beaters</span>
          </h1>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <ExchangeNfts />
          </div>
        </div>
      </div>
    </>
  );
};

export default Widthdraw;
