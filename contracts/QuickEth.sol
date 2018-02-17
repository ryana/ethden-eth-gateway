pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/ERC721/ERC721.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

contract QuickETH is ERC721, Ownable {
  using SafeMath for uint256;


  // Since making the token revocable technically breaks the ERC721 standard,
  // we cannot inherit from ERC721Token. We'll use the interface from ERC721,
  // but we need to be able to have the QuickETH contract owner revoke the
  // tokens.


  // Total amount of tokens
  uint256 private totalTokens;

  // Mapping from token ID to owner
  mapping (uint256 => address) private tokenOwner;

  // Mapping from token ID to approved address
  mapping (uint256 => address) private tokenApprovals;

  // Mapping from owner to list of owned token IDs
  mapping (address => uint256[]) private ownedTokens;

  // Mapping from token ID to index of the owner tokens list
  mapping(uint256 => uint256) private ownedTokensIndex;

  /**
  * @dev Guarantees msg.sender is owner of the given token
  * @param _tokenId uint256 ID of the token to validate its ownership belongs to msg.sender
  */
  modifier onlyOwnerOf(uint256 _tokenId) {
    require(ownerOf(_tokenId) == msg.sender);
    _;
  }

  /**
  * @dev Gets the total amount of tokens stored by the contract
  * @return uint256 representing the total amount of tokens
  */
  function totalSupply() public view returns (uint256) {
    return totalTokens;
  }

  /**
  * @dev Gets the balance of the specified address
  * @param _owner address to query the balance of
  * @return uint256 representing the amount owned by the passed address
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return ownedTokens[_owner].length;
  }

  /**
  * @dev Gets the list of tokens owned by a given address
  * @param _owner address to query the tokens of
  * @return uint256[] representing the list of tokens owned by the passed address
  */
  function tokensOf(address _owner) public view returns (uint256[]) {
    return ownedTokens[_owner];
  }

  /**
  * @dev Gets the owner of the specified token ID
  * @param _tokenId uint256 ID of the token to query the owner of
  * @return owner address currently marked as the owner of the given token ID
  */
  function ownerOf(uint256 _tokenId) public view returns (address) {
    address owner = tokenOwner[_tokenId];
    require(owner != address(0));
    return owner;
  }

  /**
   * @dev Gets the approved address to take ownership of a given token ID
   * @param _tokenId uint256 ID of the token to query the approval of
   * @return address currently approved to take ownership of the given token ID
   */
  function approvedFor(uint256 _tokenId) public view returns (address) {
    return tokenApprovals[_tokenId];
  }

  /**
  * @dev Transfers the ownership of a given token ID to another address
  * @param _to address to receive the ownership of the given token ID
  * @param _tokenId uint256 ID of the token to be transferred
  */
  function transfer(address _to, uint256 _tokenId) public onlyOwnerOf(_tokenId) {
    clearApprovalAndTransfer(msg.sender, _to, _tokenId);
  }

  /**
  * @dev Approves another address to claim for the ownership of the given token ID
  * @param _to address to be approved for the given token ID
  * @param _tokenId uint256 ID of the token to be approved
  */
  function approve(address _to, uint256 _tokenId) public onlyOwnerOf(_tokenId) {
    address owner = ownerOf(_tokenId);
    require(_to != owner);
    if (approvedFor(_tokenId) != 0 || _to != 0) {
      tokenApprovals[_tokenId] = _to;
      Approval(owner, _to, _tokenId);
    }
  }

  /**
  * @dev Claims the ownership of a given token ID
  * @param _tokenId uint256 ID of the token being claimed by the msg.sender
  */
  function takeOwnership(uint256 _tokenId) public {
    require(isApprovedFor(msg.sender, _tokenId));
    clearApprovalAndTransfer(ownerOf(_tokenId), msg.sender, _tokenId);
  }

  /**
  * @dev Mint token function
  * @param _to The address that will own the minted token
  * @param _tokenId uint256 ID of the token to be minted by the msg.sender
  */
  function _mint(address _to, uint256 _tokenId) internal {
    require(_to != address(0));
    addToken(_to, _tokenId);
    Transfer(0x0, _to, _tokenId);
  }

  
  /**
   * @dev Tells whether the msg.sender is approved for the given token ID or not
   * This function is not private so it can be extended in further implementations like the operatable ERC721
   * @param _owner address of the owner to query the approval of
   * @param _tokenId uint256 ID of the token to query the approval of
   * @return bool whether the msg.sender is approved for the given token ID or not
   */
  function isApprovedFor(address _owner, uint256 _tokenId) internal view returns (bool) {
    return approvedFor(_tokenId) == _owner;
  }

  /**
  * @dev Internal function to clear current approval and transfer the ownership of a given token ID
  * @param _from address which you want to send tokens from
  * @param _to address which you want to transfer the token to
  * @param _tokenId uint256 ID of the token to be transferred
  */
  function clearApprovalAndTransfer(address _from, address _to, uint256 _tokenId) internal {
    require(_to != address(0));
    require(_to != ownerOf(_tokenId));
    require(ownerOf(_tokenId) == _from);

    clearApproval(_from, _tokenId);
    removeToken(_from, _tokenId);
    addToken(_to, _tokenId);
    Transfer(_from, _to, _tokenId);
  }

  /**
  * @dev Internal function to clear current approval of a given token ID
  * @param _tokenId uint256 ID of the token to be transferred
  */
  function clearApproval(address _owner, uint256 _tokenId) private {
    require(ownerOf(_tokenId) == _owner);
    tokenApprovals[_tokenId] = 0;
    Approval(_owner, 0, _tokenId);
  }

  /**
  * @dev Internal function to add a token ID to the list of a given address
  * @param _to address representing the new owner of the given token ID
  * @param _tokenId uint256 ID of the token to be added to the tokens list of the given address
  */
  function addToken(address _to, uint256 _tokenId) private {
    require(tokenOwner[_tokenId] == address(0));
    tokenOwner[_tokenId] = _to;
    uint256 length = balanceOf(_to);
    ownedTokens[_to].push(_tokenId);
    ownedTokensIndex[_tokenId] = length;
    totalTokens = totalTokens.add(1);
  }

  /**
  * @dev Internal function to remove a token ID from the list of a given address
  * @param _from address representing the previous owner of the given token ID
  * @param _tokenId uint256 ID of the token to be removed from the tokens list of the given address
  */
  function removeToken(address _from, uint256 _tokenId) private {
    require(ownerOf(_tokenId) == _from);

    uint256 tokenIndex = ownedTokensIndex[_tokenId];
    uint256 lastTokenIndex = balanceOf(_from).sub(1);
    uint256 lastToken = ownedTokens[_from][lastTokenIndex];

    tokenOwner[_tokenId] = 0;
    ownedTokens[_from][tokenIndex] = lastToken;
    ownedTokens[_from][lastTokenIndex] = 0;
    // Note that this will handle single-element arrays. In that case, both tokenIndex and lastTokenIndex are going to
    // be zero. Then we can make sure that we will remove _tokenId from the ownedTokens list since we are first swapping
    // the lastToken to the first position, and then dropping the element placed in the last position of the list

    ownedTokens[_from].length--;
    ownedTokensIndex[_tokenId] = 0;
    ownedTokensIndex[lastToken] = tokenIndex;
    totalTokens = totalTokens.sub(1);
  }


  // *** This is the function we need to change. Gotta make it so the
  // QuickETH contract owner can burn. Since this function is internal,
  // it is ok to remove the onlyOwnerOf modifier as long as we are
  // ridiculously good looki-- I mean careful. Ridiculously careful.

  /**
  * @dev Burns a specific token
  * @param _tokenId uint256 ID of the token being burned by the msg.sender
  */
  function _burn(uint256 _tokenId) internal {
    address ownerOfToken = ownerOf(_tokenId);

    if (approvedFor(_tokenId) != 0) {
      clearApproval(ownerOfToken, _tokenId);
    }
    removeToken(ownerOfToken, _tokenId);
    Transfer(ownerOfToken, 0x0, _tokenId);
  }


  // Beginning of our awesome code!


  string constant public NAME = "QuickETH";
  string constant public SYMBOL = "QET";

  uint256 public availableBalance = 0;

  /**
   * @dev This is the non-standard part of the NFT.
   * Each one has an amount in ETH and a timestamp
   * after which the token can be converted into
   * ETH and burned.
   */
  struct QET {
    uint256 amount;
    uint revocationPeriodExpiresAt;
  }

  /**
   * Our mapping of token id to token metadata.
   * The ERC721Token that we inherit from handles
   * the ownership, which is why you haven't seen
   * any addresses here or in the struct itself.
   */ 
  QET[] qets;
  mapping(uint256 => address) public qetIndexToOwner;

  /**
   * @dev  Only owner can fund the contract 
   */ 
  function QuickETH() public {
  }

  function () public payable onlyOwner {
    availableBalance = availableBalance + msg.value;
  }

  function getName() public pure returns(string){
    return NAME;
  }

  function getSymbol() public pure returns(string) {
    return SYMBOL;
  }

  function getTokenAmount(uint256 id) public view returns(uint256) {
    require(qetIndexToOwner[id] != 0);
    return qets[id].amount;
  }
  
  function getTokenTimestamp(uint256 id) public view returns(uint) {
    require(qetIndexToOwner[id] != 0);
    return qets[id].revocationPeriodExpiresAt;
  }

  /**
   * @dev only the owner can mint a new token, and there
   * needs to be enough available funds
   */
  function mint(address ownerOfNewToken, uint256 amount, uint256 timestamp)
    public
    onlyOwner
  {
    require(amount > 0); 
    require(amount <= availableBalance);

    QET memory qet = QET({
      amount: amount,
      revocationPeriodExpiresAt: timestamp
    });

    uint256 newTokenId = qets.push(qet) - 1;
    
    qetIndexToOwner[newTokenId] = ownerOfNewToken;

    _mint(ownerOfNewToken, newTokenId);
    
    availableBalance = availableBalance - amount;
  }

  /**
   * @dev Once the recovation period has expired,
   * burn the token and transfer the eth to the
   * owber of tge token. This can be called by the
   * token owner or the contract owner. The latter
   * enables us to give our users the option to have
   * us automatically send them ether. Makes
   * integration easier.
   */
  function exchange(uint256 tokenId) public {
    address tokenOwner = qetIndexToOwner[tokenId];
    require(msg.sender != 0);
    require((tokenOwner == msg.sender) || (owner == msg.sender));
    require(block.timestamp >= qets[tokenId].revocationPeriodExpiresAt);
    
    uint256 amount = qets[tokenId].amount;
    qets[tokenId].amount = 0;
    qets[tokenId].revocationPeriodExpiresAt = 0;

    _burn(tokenId);
    tokenOwner.transfer(amount);
  }

  /**
   * @dev revoke a token, but keep track of it JIC
   */
  function revoke(uint256 tokenId) public onlyOwner {
    require(now < qets[tokenId].revocationPeriodExpiresAt);

    qets[tokenId].amount = 0;
    qets[tokenId].revocationPeriodExpiresAt = 0;

    _burn(tokenId);
  }
}
