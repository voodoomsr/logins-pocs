import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { aws_cloudfront } from 'aws-cdk-lib';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class LoginsPocsTwoInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const environment = process.env.ENVIRONMENT || 'dev';
    const appName = process.env.APP_NAME || 'my-react-app';

    const siteBucketName = `${environment}-${appName}-static-site`;
    const distributionId = `${environment}-${appName}-static-site-distribution`;

    // Create S3 bucket without public access
    const siteBucket = new s3.Bucket(this, siteBucketName);

    // Create OAI
    const oai = new cloudfront.OriginAccessIdentity(this, 'StaticSiteOAI');

    // Grant OAI read access to the S3 bucket
    siteBucket.grantRead(oai);

    // Create CloudFront distribution with OAI origin
    const distribution = new cloudfront.Distribution(this, distributionId, {
      defaultBehavior: {
        origin: new S3Origin(siteBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
    });

    // Deploy React app to S3
    new s3deploy.BucketDeployment(this, 'DeployStaticSite', {
      sources: [s3deploy.Source.asset('../dist')],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Print the CloudFront URL after deployment
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: distribution.distributionDomainName,
      description: 'CloudFront URL for the static site',
    });
  }
}
