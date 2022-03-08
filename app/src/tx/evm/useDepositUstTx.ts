import { useEvmCrossAnchorSdk } from 'crossanchor';
import { EvmChainId, useEvmWallet } from '@libs/evm-wallet';
import { TxResultRendering } from '@libs/app-fns';
import { txResult, TX_GAS_LIMIT } from './utils';
import { Subject } from 'rxjs';
import { useCallback } from 'react';
import { ContractReceipt } from 'ethers';
import { TwoWayTxResponse } from '@anchor-protocol/crossanchor-sdk';
import { PersistedTxResult, usePersistedTx } from './usePersistedTx';
import { useFormatters } from '@anchor-protocol/formatter/useFormatters';
import { UST } from '@libs/types';
import { TxEventHandler } from './useTx';

type DepositUstTxResult = TwoWayTxResponse<ContractReceipt> | null;
type DepositUstTxRender = TxResultRendering<DepositUstTxResult>;

export interface DepositUstTxParams {
  depositAmount: string;
}

export function useDepositUstTx():
  | PersistedTxResult<DepositUstTxParams, DepositUstTxResult>
  | undefined {
  const {
    address,
    connection,
    connectType,
    chainId = EvmChainId.ETHEREUM_ROPSTEN,
  } = useEvmWallet();
  const xAnchor = useEvmCrossAnchorSdk();
  const {
    ust: { microfy, formatInput, formatOutput },
  } = useFormatters();

  const depositTx = useCallback(
    async (
      txParams: DepositUstTxParams,
      renderTxResults: Subject<DepositUstTxRender>,
      handleEvent: TxEventHandler<DepositUstTxParams>,
    ) => {
      const depositAmount = microfy(
        formatInput(txParams.depositAmount),
      ).toString();

      await xAnchor.approveLimit(
        { token: 'ust' },
        depositAmount,
        address!,
        TX_GAS_LIMIT,
        (event) => {
          renderTxResults.next(
            txResult(event, connectType, chainId, 'deposit'),
          );
          handleEvent(event, txParams);
        },
      );

      return xAnchor.depositStable(
        depositAmount,
        address!,
        TX_GAS_LIMIT,
        (event) => {
          console.log(event, 'eventEmitted');

          renderTxResults.next(
            txResult(event, connectType, chainId, 'deposit'),
          );
          handleEvent(event, txParams);
        },
      );
    },
    [address, connectType, xAnchor, chainId, microfy, formatInput],
  );

  const persistedTxResult = usePersistedTx<
    DepositUstTxParams,
    DepositUstTxResult
  >(
    depositTx,
    (resp) => resp.tx,
    null,
    (txParams) => ({
      action: 'depositStable',
      amount: `${formatOutput(txParams.depositAmount as UST)} UST`,
      timestamp: Date.now(),
    }),
  );

  return chainId && connection && address ? persistedTxResult : undefined;
}
