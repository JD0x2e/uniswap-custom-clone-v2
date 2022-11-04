// imports
import "./App.css";
import { useState, useEffect } from "react";
import { ethers, BigNumber } from "ethers";
import { GearFill } from "react-bootstrap-icons";

import PageButton from "./components/PageButton";
import ConfigModal from "./components/ConfigModal";
import ConnectButton from "./components/ConnectButton";
import CurrencyField from "./components/CurrencyField";
import { Dots } from "loading-animations-react";
import coinsJson from "./coinList.json";
import ERC20ABI from "./abi.json";
import JSBI from "jsbi";

// consts
const { Token, CurrencyAmount, TradeType, Percent } = require("@uniswap/sdk-core");
const { AlphaRouter } = require("@uniswap/smart-order-router");
const V3_SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
const chainId = 5;
const web3Provider = new ethers.providers.JsonRpcProvider(process.env.REACT_APP_INFURA_URL_TESTNET);
const router = new AlphaRouter({ chainId: chainId, provider: web3Provider });

export default function App() {
  // useStates
  const [coin1, setCoin1] = useState();
  const [coin2, setCoin2] = useState();
  const [coin1Amount, setCoin1Amount] = useState(undefined);
  const [coin2Amount, setCoin2Amount] = useState(undefined);
  const [coinContract, setCoinContract] = useState(undefined);

  // Ethers consts
  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  const [myAddress, setMyAddress] = useState(undefined);

  // ChangeModal consts
  const [slippageAmount, setSlippageAmount] = useState(2);
  const [deadlineMinutes, setDeadlineMinutes] = useState(10);
  const [showModal, setShowModal] = useState(undefined);

  // Swap Consts
  const [inputAmount, setInputAmount] = useState(undefined);
  const [outputAmount, setOutputAmount] = useState(undefined);
  const [transaction, setTransaction] = useState(undefined);
  const [loading, setLoading] = useState(undefined);
  const [ratio, setRatio] = useState(undefined);

  // useEffect for declaring tokens and setting state
  useEffect(() => {
    const token1 = new Token(chainId, coinsJson[0].address, coinsJson[0].decimals, coinsJson[0].symbol, coinsJson[0].name);
    setCoin1(token1);
    const token2 = new Token(chainId, coinsJson[1].address, coinsJson[1].decimals, coinsJson[1].symbol, coinsJson[1].name);
    setCoin2(token2);
  }, []);

  // function to getSigner
  const getSigner = async (provider) => {
    const tmpProvider = await new ethers.providers.Web3Provider(window.ethereum);
    setProvider(tmpProvider);
    tmpProvider.send("eth_requestAccounts");
    const tmpSigner = await tmpProvider.getSigner();
    setSigner(tmpSigner);
    const myAddress = await tmpSigner.getAddress();
    setMyAddress(myAddress);
    // console.log("Signer Set", myAddress);
    await getBalance(coinsJson[0], myAddress);
  };

  // function to getBalance of coin1
  const getBalance = async (coin, tmpAddress = false) => {
    const coinContract1 = new ethers.Contract(coin.address, ERC20ABI, web3Provider);
    const res = await coinContract1.balanceOf(myAddress || tmpAddress);
    // console.log("Balance in wallet: ", Number(ethers.utils.formatEther(res)));
    setCoin1(coin);
    setCoin1Amount(Number(ethers.utils.formatEther(res)));
    setCoinContract(coinContract1);
  };

  // function to getBalance of coin2
  const getBalance2 = async (coin, tmpAddress = false) => {
    const coinContract2 = new ethers.Contract(coin.address, ERC20ABI, web3Provider);
    const res = await coinContract2.balanceOf(myAddress || tmpAddress);
    // console.log("Balance in wallet: ", Number(ethers.utils.formatEther(res)));
    setCoin2(coin);
    setCoin2Amount(Number(ethers.utils.formatEther(res)));
    setCoinContract(coinContract2);
  };

  // function to runSwap
  const runSwap = async (transaction, signer) => {
    const approvalAmount = ethers.utils.parseUnits("10", 18).toString();
    await coinContract.connect(signer).approve(V3_SWAP_ROUTER_ADDRESS, approvalAmount);
    signer.sendTransaction(transaction);
  };

  // function to check if connected
  const isConnected = () => signer !== undefined;

  // function to getPrice
  const getPrice = async (inputAmount, slippageAmount, deadline, walletAddress) => {
    const percentSlippage = new Percent(slippageAmount, 100);
    const wei = ethers.utils.parseUnits(inputAmount.toString(), coin1.decimals);
    const currencyAmount = CurrencyAmount.fromRawAmount(coin1, JSBI.BigInt(wei));

    const route = await router.route(currencyAmount, coin2, TradeType.EXACT_INPUT, {
      recipient: walletAddress,
      slippageTolerance: percentSlippage,
      deadline: deadline,
    });

    const transaction = {
      data: route.methodParameters.calldata,
      to: V3_SWAP_ROUTER_ADDRESS,
      value: BigNumber.from(route.methodParameters.value),
      from: walletAddress,
      gasPrice: BigNumber.from(route.gasPriceWei),
      gasLimit: ethers.utils.hexlify(1000000),
    };

    const quoteAmountOut = route.quote.toFixed(6);
    const ratio = (inputAmount / quoteAmountOut).toFixed(3);

    return [transaction, quoteAmountOut, ratio];
  };

  // function to getSwapPrice
  const getSwapPrice = (inputAmount) => {
    setLoading(true);
    // setInputAmount(inputAmount);

    // function to getPrice
    const swap = getPrice(inputAmount, slippageAmount, Math.floor(Date.now() / 1000 + deadlineMinutes * 60), myAddress).then(
      (data) => {
        setTransaction(data[0]);
        setOutputAmount(data[1]);
        setRatio(data[2]);
        setLoading(false);
      }
    );
  };

  const handleInput = (e) => {
    setInputAmount(e.target.value);
  };

  console.log(ratio);

  // return
  return (
    <div className="App">
      <div className="appNav">
        <div className="my-2 buttonContainer buttonContainerTop">
          <PageButton name={"Swap"} isBold={true} />
          <PageButton name={"Pool"} />
          <PageButton name={"Vote"} />
          <PageButton name={"Charts"} />
        </div>
        <div className="rightNav">
          <div className="connectButtonContainer">
            <ConnectButton provider={provider} isConnected={isConnected} signerAddress={myAddress} getSigner={getSigner} />
          </div>
          <div className="my-2 buttonContainer">
            <PageButton name={"..."} isBold={true} />
          </div>
        </div>
      </div>

      <div className="appBody">
        <div className="swapContainer">
          <div className="swapHeader">
            <span className="swapText">Swap</span>
            <span className="gearContainer" onClick={() => setShowModal(true)}>
              <GearFill />
            </span>
            {showModal && (
              <ConfigModal
                onClose={() => setShowModal(false)}
                setDeadlineMinutes={setDeadlineMinutes}
                deadlineMinutes={deadlineMinutes}
                setSlippageAmount={setSlippageAmount}
                slippageAmount={slippageAmount}
              />
            )}
          </div>

          <div className="swapBody">
            <CurrencyField
              field="input"
              tokenName={coin1?.symbol}
              getSwapPrice={getSwapPrice}
              signer={signer}
              balance={coin1Amount}
              getBalance={getBalance}
              value={inputAmount}
              handleInput={handleInput}
            />
            <CurrencyField
              field="output"
              tokenName={coin2?.symbol}
              value={outputAmount}
              signer={signer}
              getBalance={getBalance2}
              balance={coin2Amount}
              Dots={Dots}
              loading={loading}
            />
          </div>

          <div className="ratioContainer">{ratio}</div>
          {/* <div className="ratioContainer">{ratio !== undefined && <>{`1 Coin = ${ratio} Coin`}</>}</div> */}

          <div className="swapButtonContainer">
            {isConnected() ? (
              <div onClick={() => runSwap(transaction, signer)} className="swapButton">
                Swap
              </div>
            ) : (
              <div onClick={() => getSigner(provider)} className="swapButton">
                Connect Wallet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
