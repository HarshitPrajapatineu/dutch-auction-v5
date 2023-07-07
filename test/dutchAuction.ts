import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { signERC2612Permit } from 'eth-permit';

const provider = ethers.provider;
describe("DutchAuction", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function deployNFTDutch() {
    const NFTDutch = await ethers.getContractFactory("NFTDutch");
    const dutch_nft = await NFTDutch.deploy();
    return { dutch_nft };
  }
  async function deployBidToken() {
    const BidToken = await ethers.getContractFactory("BidToken");
    const bid_token = await BidToken.deploy();
    return { bid_token };
  }
  async function deployDutchAuction() {
    const reservePrice = "10000";
    const numBlocksAuctionOpen = 1000;

    const offerPriceDecrement = "10";
    const [owner, account1, account2, account3, account4, account5] = await ethers.getSigners();

    const { dutch_nft } = await loadFixture(deployNFTDutch);
    const { bid_token } = await loadFixture(deployBidToken);
    const nft_address = dutch_nft.address;
    const token_address = bid_token.address;
    await dutch_nft.connect(owner).safeMint(owner.address);
    await bid_token.connect(owner).transfer(account1.address, ethers.utils.parseEther("1000"))
    await bid_token.connect(owner).transfer(account2.address, ethers.utils.parseEther("1000"))
    await bid_token.connect(owner).transfer(account3.address, ethers.utils.parseEther("1000"))
    await bid_token.connect(owner).transfer(account4.address, ethers.utils.parseEther("1000"))
    await bid_token.connect(owner).transfer(account5.address, ethers.utils.parseEther("1000"))
    const nft_id = 1;
    const DutchAuction = await ethers.getContractFactory("proxy");
    // const dutch_auction = await DutchAuction.deploy(token_address, nft_address, nft_id,reservePrice, numBlocksAuctionOpen, offerPriceDecrement);
    const dutch_auction = await upgrades.deployProxy(DutchAuction, [token_address, nft_address, nft_id, reservePrice, numBlocksAuctionOpen, offerPriceDecrement], { kind: 'uups' });
    await dutch_nft.connect(owner).approve(dutch_auction.address, nft_id);
    console.log(owner.getAddress);
    const balance = await provider.getBalance(owner.address);
    console.log(balance + "adcawescaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    return { bid_token, token_address, dutch_nft, nft_address, nft_id, dutch_auction, reservePrice, numBlocksAuctionOpen, offerPriceDecrement, owner, account1, account2, account3, account4 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { dutch_auction, owner, account1 } = await loadFixture(deployDutchAuction);
      // expect(await dutch_auction.owner()).to.equal(owner.address);
      expect(await dutch_auction.owner()).to.equal(owner.address);
    });

    it("Should set the right erc721 address", async function () {
      const { nft_address, dutch_auction } = await loadFixture(deployDutchAuction);
      expect(await dutch_auction.NFT_address()).to.equal((await nft_address).toString());
    });

    it("Should set the right erc721 token ID", async function () {
      const { nft_id, dutch_auction } = await loadFixture(deployDutchAuction);
      expect(await dutch_auction.NFT_id()).to.equal(nft_id);
    });

    it("Should set the right reserve price", async function () {
      const { dutch_auction, reservePrice } = await loadFixture(deployDutchAuction);
      expect(await dutch_auction.reservePrice()).to.equal(reservePrice);
    });

    it("Should set the right number of block auction open", async function () {
      const { dutch_auction, numBlocksAuctionOpen } = await loadFixture(deployDutchAuction);
      expect(await dutch_auction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    });

    it("Should set the right offer price decrement", async function () {
      const { dutch_auction, offerPriceDecrement } = await loadFixture(deployDutchAuction);
      expect(await dutch_auction.offerPriceDecrement()).to.equal(offerPriceDecrement);
    });

    it("check owner of token id 1", async function () {
      const { owner, dutch_nft, nft_id } = await loadFixture(deployDutchAuction);
      expect(await dutch_nft.ownerOf(nft_id)).to.equal(owner.address);
    });


  });
  describe("Auction", function () {
    it("Is auction contract approved for transfering NFT", async function () {
      const { dutch_nft, nft_id, dutch_auction } = await loadFixture(deployDutchAuction);
      expect(await dutch_nft.getApproved(nft_id)).to.equal(dutch_auction.address)
    });

    it("Buyers will bid and bid will be reverted with not enough amount", async function () {
      const { bid_token, dutch_auction, owner, account1, account2, account3, account4 } = await loadFixture(deployDutchAuction);
      const result = await signERC2612Permit(account1, bid_token.address, account1.address, dutch_auction.address, 1000);

      await bid_token.connect(account1).permit(account1.address, dutch_auction.address, 1000, result.deadline, result.v, result.r, result.s);
      // await bid_token.permit(account1.address, dutch_auction.address, 1000, deadline, v, r, s)
      const bidder_balance = await bid_token.balanceOf(account1.address)
      // await dutch_auction.connect(account1).bid('1000');
      await expect(dutch_auction.connect(account1).bid('1000')).to.be.revertedWith(
        "not enough amount of bid"
      );
      // const receipt1 = await bid1.wait()
      expect(await bid_token.balanceOf(account1.address)).to.equal(bidder_balance);
    });

    it("Buyer's bid will accepted and token transfered to buyer", async function () {
      const { bid_token, dutch_nft, nft_id, dutch_auction, owner, account1, account2, account3, account4 } = await loadFixture(deployDutchAuction);
      const balance_before = await owner.getBalance();
      // await bid_token.connect(account3).approve(dutch_auction.address,50000);
      const result = await signERC2612Permit(account3, bid_token.address, account3.address, dutch_auction.address, 50000);
      await bid_token.connect(account3).permit(account3.address, dutch_auction.address, 50000, result.deadline, result.v, result.r, result.s);
      const bidder_balance = await bid_token.balanceOf(account3.address);
      const owner_balance = await bid_token.balanceOf(owner.address);
      await dutch_auction.connect(account3).bid('50000');
      expect(await bid_token.balanceOf(account3.address)).to.eq(bidder_balance.sub("50000"))
      expect(await bid_token.balanceOf(owner.address)).to.eq(owner_balance.add("50000"));
      expect(await dutch_nft.ownerOf(nft_id)).to.equal(account3.address);
    });

    it("Buyers can not bid after auction ended", async function () {
      const { bid_token, dutch_auction, owner, account1, account2, account3, account4 } = await loadFixture(deployDutchAuction);
      // await bid_token.connect(account4).approve(dutch_auction.address,50000);
      // const bid3 = await dutch_auction.connect(account3).bid('1000');
      const result = await signERC2612Permit(account4, bid_token.address, account4.address, dutch_auction.address, 50000);
      await bid_token.connect(account4).permit(account4.address, dutch_auction.address, 50000, result.deadline, result.v, result.r, result.s);
      expect(await dutch_auction.connect(account4).bid('50000')).to.be.revertedWith(
        "auction is ended"
      );
      // await bid_token.connect(account4).approve(dutch_auction.address,0);
    });

    it("Owner can not bid", async function () {
      const { dutch_auction, owner } = await loadFixture(deployDutchAuction);
      await expect(dutch_auction.connect(owner).bid('1000')).to.be.revertedWith(
        "owner can't bid"
      );
    });
  });
});
