import { StreamReturn } from '@rx-stream/react';
import { useEvmCrossAnchorSdk } from 'crossanchor';
import { useEvmWallet } from '@libs/evm-wallet';
import { TxResultRendering } from '@libs/app-fns';
import { toWei, txResult, TX_GAS_LIMIT } from './utils';
import { Subject } from 'rxjs';
import { useCallback } from 'react';
import { CrossChainTxResponse } from '@anchor-protocol/crossanchor-sdk';
import { ContractReceipt } from 'ethers';
import { useRedeemableTx } from './useRedeemableTx';

type TxResult = CrossChainTxResponse<ContractReceipt> | null;
type TxRender = TxResultRendering<TxResult>;

export interface RepayUstTxProps {
  amount: string;
}

export function useRepayUstTx():
  | StreamReturn<RepayUstTxProps, TxRender>
  | [null, null] {
  const { address, connection, connectType, chainId } = useEvmWallet();
  const evmSdk = useEvmCrossAnchorSdk();

  const repayTx = useCallback(
    (txParams: RepayUstTxProps, renderTxResults: Subject<TxRender>) => {
      return evmSdk.repayStable(
        toWei(txParams.amount),
        address!,
        TX_GAS_LIMIT,
        (event) => {
          console.log(event, 'eventEmitted');

          renderTxResults.next(txResult(event, connectType, chainId!, 'repay'));
        },
      );
    },
    [evmSdk, address, connectType, chainId],
  );

  const repayTxStream = useRedeemableTx(repayTx, (resp) => resp.tx, null);

  return chainId && connection && address ? repayTxStream : [null, null];
}