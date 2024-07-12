import { Ref, RefObject, useEffect, useRef, useState } from 'react';

import {
  Box,
  Button,
  Flex,
  IconButton,
  Loader,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { CarretDown, CarretUp, ChevronRight } from '@strapi/icons';
// eslint-disable-next-line import/no-extraneous-dependencies
import Markdown from 'react-markdown';
// @ts-expect-error - remark-utf8 is not typed
// eslint-disable-next-line import/no-extraneous-dependencies
import utf8 from 'remark-utf8';
import styled from 'styled-components';

const IconButtonCustom = styled(IconButton)`
  background-color: transparent;

  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;
const CustomBox = styled(Box)`
  span {
    display: block;
  }
`;

const KapaPrompt = ({ modalBodyRef }: { modalBodyRef: RefObject<HTMLDivElement> }) => {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [identifiers, setIdentifiers] = useState<{
    question_answer_id: string;
    thread_id: string;
  }>();
  const [error, setError] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isFetching, setIsFetching] = useState(false);

  const process_stream = async (response: Response) => {
    if (response.body === null) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const delimiter = '\u241E';
    const delimiterBytes = new TextEncoder().encode(delimiter);
    let buffer = new Uint8Array();

    const findDelimiterIndex = (arr: string | Uint8Array) => {
      for (let i = 0; i < arr.length - delimiterBytes.length + 1; i++) {
        let found = true;
        for (let j = 0; j < delimiterBytes.length; j++) {
          if (arr[i + j] !== delimiterBytes[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          return i;
        }
      }
      return -1;
    };

    let result;
    while (true) {
      result = await reader.read();
      if (result.done) break;
      buffer = new Uint8Array([...buffer, ...result.value]);
      let delimiterIndex;
      while ((delimiterIndex = findDelimiterIndex(buffer)) !== -1) {
        const chunkBytes = buffer.slice(0, delimiterIndex);
        const chunkText = decoder.decode(chunkBytes);
        buffer = buffer.slice(delimiterIndex + delimiterBytes.length);
        const chunk = JSON.parse(chunkText);

        if (chunk.chunk.type === 'partial_answer') {
          setAnswer((prevAnswer) => prevAnswer + chunk.chunk.content.text);
        } else if (chunk.chunk.type === 'identifiers') {
          setIdentifiers(chunk.chunk.content);
        } else if (chunk.chunk.type === 'error') {
          setError(chunk.chunk.content.reason);
          break;
        }
      }
    }
  };

  const handlePrompt = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(
        identifiers?.thread_id
          ? `https://api.kapa.ai/query/v1/thread/${identifiers.thread_id}/stream?query=${query}`
          : `https://api.kapa.ai/query/v1/stream?query=${query}`,
        {
          method: 'GET',
          headers: {
            'X-API-TOKEN': '32a44459-5824-41a4-9344-68cea4947fc2',
          },
        }
      );

      if (response.status === 200) {
        setIsFetching(false);
        setQuery('');
        process_stream(response);
      } else {
        setIsFetching(false);
        const message = await response.text();
        console.error('Error fetching data:', message);
        setError(`Request failed with status code ${response.status}. Message: ${message}`);
      }
    } catch (error) {
      setIsFetching(false);
      console.error('Error fetching data:', error);

      // @ts-expect-error - For PoC purposes
      setError(`Request failed: ${error.message}`);
    }
  };

  const handleFeedback = async (question_id: string, reaction: string) => {
    const apiUrl = `https://api.kapa.ai/query/v1/question-answer/${question_id}/feedback`;
    const feedbackData = {
      question_id: question_id,
      reaction: reaction,
      user_identifier: 'user-identifier', // be careful what you submit here to not violate any privacy policies. One possibility is to hash the users ip address with sha-256
    };

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-TOKEN': '32a44459-5824-41a4-9344-68cea4947fc2',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.status === 200) {
        setFeedback(reaction);
      } else {
        setError(
          'There was an error in submitting your feedback. Please refresh the page and try again.'
        );
        console.error('Error sending feedback:', response.status);
      }
    } catch (error) {
      setError(
        'There was an error in submitting your feedback. Please refresh the page and try again.'
      );
      console.error('Error sending feedback:', error);
    }
  };

  useEffect(() => {
    // Scroll to bottom when answer changes
    const el = document.getElementById('kapa-modal-layout');

    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [answer, modalBodyRef]);

  return (
    <Box>
      <Box paddingTop={6} paddingBottom={4}>
        <Typography variant="pi">
          Disclaimer: Answers are AI-generated and might be inaccurate. Please ensure you
          double-check the information provided by visiting source pages.
        </Typography>
      </Box>
      <Box paddingBottom={3}>
        {error ? (
          <div>
            <h2>Error:</h2>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <CustomBox paddingBottom={3} lineHeight={1.4}>
              <Markdown
                components={{
                  ol: ({ children }) => (
                    <Box as="ol" marginTop={3} marginBottom={3}>
                      {children}
                    </Box>
                  ),
                  li: ({ children }) => (
                    <Box as="li" marginBottom={2}>
                      <Typography>{children}</Typography>
                    </Box>
                  ),
                  p: ({ children }) => <Typography>{children}</Typography>,
                  pre: ({ children }) => (
                    <Box
                      as="pre"
                      padding={3}
                      marginTop={2}
                      marginBottom={2}
                      background="neutral1000"
                      hasRadius
                      color="neutral0"
                    >
                      {children}
                    </Box>
                  ),
                }}
                remarkPlugins={[utf8]}
              >
                {answer}
              </Markdown>
            </CustomBox>
            {identifiers && (
              <Flex justifyContent="flex-end" marginTop={4} marginBottom={4} gap={2}>
                <Button
                  startIcon={<CarretUp />}
                  variant="success-light"
                  disabled={feedback === 'upvote'}
                  onClick={() => handleFeedback(identifiers.question_answer_id, 'upvote')}
                >
                  Upvote
                </Button>
                <Button
                  startIcon={<CarretDown />}
                  variant="danger-light"
                  disabled={feedback === 'downvote'}
                  onClick={() => handleFeedback(identifiers.question_answer_id, 'downvote')}
                >
                  Downvote
                </Button>
              </Flex>
            )}
          </>
        )}
        {isFetching && (
          <Flex justifyContent="center" alignItems="center" paddingBottom={3}>
            <Loader />
          </Flex>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePrompt();
          }}
        >
          <TextInput
            label=" "
            placeholder="Ask me a question..."
            onChange={(e) => setQuery(e.target.value)}
            value={query}
            endAction={
              <IconButtonCustom noBorder type="submit" aria-label="send">
                <ChevronRight />
              </IconButtonCustom>
            }
          />
        </form>
      </Box>
    </Box>
  );
};

export { KapaPrompt };
